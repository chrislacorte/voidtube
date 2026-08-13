import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  createEmptyCanvas,
  generateId,
  getActiveCanvas,
  loadState,
  saveState,
  updateActiveCanvas,
} from '../lib/storage'
import { DEFAULT_LAYOUT_ID, getCanvasLayout, isLayoutActive } from '../lib/canvasLayouts'
import {
  applyLayoutToNodes,
  applySelectionLayoutToNodes,
  computeGridPositionsForNewNodes,
  computeLayoutAnchor,
  resolvePlacementForType,
} from '../lib/layoutEngine'
import { formatTimestamp } from '../lib/youtube'
import { createLayoutFromPreset, normalizeFocusLayout } from '../lib/focusLayout'
import { generatePlaylist } from '../lib/api'

const VoidTubeContext = createContext(null)

const SAVE_DELAY_MS = 300

export function VoidTubeProvider({ children }) {
  const [state, setState] = useState(loadState)
  const [draggingNodeId, setDraggingNodeId] = useState(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState([])
  const [selectionLayoutMenuOpen, setSelectionLayoutMenuOpen] = useState(true)
  const [fitViewRequest, setFitViewRequest] = useState(null)
  const playerRegistry = useRef(new Map())
  const saveTimer = useRef(null)

  const activeCanvas = useMemo(() => getActiveCanvas(state), [state])
  const focus = state.focus ?? {
    active: false,
    videoNodeId: null,
    activeTab: 'text',
    playbackHighlightNodeId: null,
    selectedNoteId: null,
    layout: normalizeFocusLayout(null),
  }
  const sidebarOpen = state.sidebarOpen ?? true

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveState(state), SAVE_DELAY_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [state])

  const patchActiveCanvas = useCallback((updates) => {
    setState((prev) => updateActiveCanvas(prev, updates))
  }, [])

  const setNodes = useCallback((nodes) => {
    patchActiveCanvas({ nodes })
  }, [patchActiveCanvas])

  const setEdges = useCallback(
    (edges) => patchActiveCanvas({ edges }),
    [patchActiveCanvas],
  )

  const setViewport = useCallback(
    (viewport) => patchActiveCanvas({ viewport }),
    [patchActiveCanvas],
  )

  const updateNodeData = useCallback((nodeId, dataUpdates) => {
    setState((prev) => {
      const canvas = getActiveCanvas(prev)
      const nodes = canvas.nodes.map((node) => {
        if (node.id !== nodeId) return node

        const nextData = { ...node.data, ...dataUpdates }
        const sizePatch =
          dataUpdates.width != null || dataUpdates.height != null
            ? {
                width: dataUpdates.width ?? node.width ?? node.data?.width,
                height: dataUpdates.height ?? node.height ?? node.data?.height,
                style: {
                  ...node.style,
                  width: dataUpdates.width ?? node.style?.width ?? node.data?.width,
                  height: dataUpdates.height ?? node.style?.height ?? node.data?.height,
                },
              }
            : {}

        return { ...node, ...sizePatch, data: nextData }
      })
      return updateActiveCanvas(prev, { nodes })
    })
  }, [])

  const updateNodeSize = useCallback((nodeId, width, height) => {
    setState((prev) => {
      const canvas = getActiveCanvas(prev)
      const nodes = canvas.nodes.map((node) => {
        if (node.id !== nodeId) return node
        return {
          ...node,
          width,
          height,
          style: { ...node.style, width, height },
          data: { ...node.data, width, height },
        }
      })
      return updateActiveCanvas(prev, { nodes })
    })
  }, [])

  const removeNode = useCallback((nodeId) => {
    setState((prev) => {
      const canvas = getActiveCanvas(prev)
      return updateActiveCanvas(prev, {
        nodes: canvas.nodes.filter((n) => n.id !== nodeId),
        edges: canvas.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      })
    })
    playerRegistry.current.delete(nodeId)
  }, [])

  const addNode = useCallback((type, position, data = {}, style = {}) => {
    const id = generateId()
    const node = {
      id,
      type,
      position,
      data: {
        title: type === 'video' ? data.title || 'Video' : getDefaultTitle(type),
        layoutSlotId: null,
        ...data,
      },
      ...(Object.keys(style).length > 0 ? { style } : {}),
    }

    setState((prev) => {
      const canvas = getActiveCanvas(prev)
      return updateActiveCanvas(prev, { nodes: [...canvas.nodes, node] })
    })

    return id
  }, [])

  const resolveNodePlacement = useCallback(
    (type, fallbackCenter) => {
      return resolvePlacementForType({
        layoutId: activeCanvas.layoutId ?? DEFAULT_LAYOUT_ID,
        nodeType: type,
        nodes: activeCanvas.nodes,
        fallbackCenter,
        layoutAnchor: activeCanvas.layoutAnchor,
      })
    },
    [activeCanvas],
  )

  const addNodeWithLayout = useCallback(
    (type, fallbackCenter, data = {}, style = {}) => {
      const id = generateId()

      setState((prev) => {
        const canvas = getActiveCanvas(prev)
        const layoutId = canvas.layoutId ?? DEFAULT_LAYOUT_ID
        const layout = getCanvasLayout(layoutId)
        const layoutAnchor = computeLayoutAnchor(
          fallbackCenter,
          canvas.layoutAnchor,
          layout,
        )

        const placement = resolvePlacementForType({
          layoutId,
          nodeType: type,
          nodes: canvas.nodes,
          fallbackCenter,
          layoutAnchor,
        })

        const sizeStyle =
          placement.size && type === 'video'
            ? { width: placement.size.width, height: placement.size.height }
            : {}

        const node = {
          id,
          type,
          position: placement.position,
          ...(type === 'video'
            ? {
                width: sizeStyle.width ?? style.width ?? 420,
                height: sizeStyle.height ?? style.height ?? 360,
              }
            : {}),
          data: {
            title: type === 'video' ? data.title || 'Video' : getDefaultTitle(type),
            layoutSlotId: placement.layoutSlotId,
            ...data,
            ...(placement.size
              ? { width: placement.size.width, height: placement.size.height }
              : {}),
          },
          ...(Object.keys({ ...style, ...sizeStyle }).length > 0
            ? { style: { ...style, ...sizeStyle } }
            : {}),
        }

        const anchorPatch =
          isLayoutActive(layoutId) && !canvas.layoutAnchor
            ? { layoutAnchor }
            : {}

        return updateActiveCanvas(prev, {
          ...anchorPatch,
          nodes: [...canvas.nodes, node],
        })
      })

      return id
    },
    [],
  )

  const addVideoNode = useCallback(
    (video, fallbackCenter) => {
      return addNodeWithLayout(
        'video',
        fallbackCenter,
        {
          title: video.title,
          videoId: video.videoId,
          channelTitle: video.channelTitle,
          thumbnailUrl: video.thumbnailUrl,
          description: video.description || '',
        },
        { width: 420, height: 360 },
      )
    },
    [addNodeWithLayout],
  )

  const setCanvasLayout = useCallback((layoutId, fallbackCenter, applyNow = true) => {
    setState((prev) => {
      const canvas = getActiveCanvas(prev)
      const nextLayoutId = layoutId || DEFAULT_LAYOUT_ID
      const layout = getCanvasLayout(nextLayoutId)
      const layoutAnchor =
        nextLayoutId === DEFAULT_LAYOUT_ID
          ? null
          : computeLayoutAnchor(fallbackCenter, canvas.layoutAnchor, layout)

      let next = updateActiveCanvas(prev, {
        layoutId: nextLayoutId,
        layoutAnchor,
      })

      if (applyNow && isLayoutActive(nextLayoutId) && fallbackCenter) {
        const updatedCanvas = getActiveCanvas(next)
        const anchor = layoutAnchor ?? computeLayoutAnchor(fallbackCenter, null, layout)
        const nodes = applyLayoutToNodes({
          nodes: updatedCanvas.nodes,
          layoutId: nextLayoutId,
          fallbackCenter,
          layoutAnchor: anchor,
        })
        next = updateActiveCanvas(next, { nodes, layoutAnchor: anchor })
      }

      if (nextLayoutId === DEFAULT_LAYOUT_ID) {
        const updatedCanvas = getActiveCanvas(next)
        const nodes = updatedCanvas.nodes.map((node) => ({
          ...node,
          className: '',
          data: { ...node.data, layoutSlotId: null },
        }))
        next = updateActiveCanvas(next, { nodes, layoutAnchor: null })
      }

      return next
    })
  }, [])

  const applyCanvasLayout = useCallback((fallbackCenter) => {
    setState((prev) => {
      const canvas = getActiveCanvas(prev)
      const layoutId = canvas.layoutId ?? DEFAULT_LAYOUT_ID
      if (!isLayoutActive(layoutId) || !fallbackCenter) return prev

      const layout = getCanvasLayout(layoutId)
      const anchor = computeLayoutAnchor(fallbackCenter, canvas.layoutAnchor, layout)

      const nodes = applyLayoutToNodes({
        nodes: canvas.nodes,
        layoutId,
        fallbackCenter,
        layoutAnchor: anchor,
      })

      return updateActiveCanvas(prev, { nodes, layoutAnchor: anchor })
    })
  }, [])

  const clearNodeLayoutSlot = useCallback((nodeId) => {
    updateNodeData(nodeId, { layoutSlotId: null })
  }, [updateNodeData])

  const applySelectionLayout = useCallback((layoutId, nodeIds) => {
    setState((prev) => {
      const canvas = getActiveCanvas(prev)
      const ids = nodeIds ?? selectedNodeIds
      if (!ids?.length) return prev

      const nodes = applySelectionLayoutToNodes(canvas.nodes, ids, layoutId)

      return updateActiveCanvas(prev, { nodes })
    })
  }, [selectedNodeIds])

  const toggleSelectionLayoutMenu = useCallback(() => {
    setSelectionLayoutMenuOpen((open) => !open)
  }, [])

  const createCanvas = useCallback((name) => {
    const canvas = createEmptyCanvas(name || `Playlist ${state.canvases.length + 1}`)
    setState((prev) => ({
      ...prev,
      activeCanvasId: canvas.id,
      canvases: [...prev.canvases, canvas],
      focus: { active: false, videoNodeId: null, activeTab: 'text', playbackHighlightNodeId: null, selectedNoteId: null, layout: normalizeFocusLayout(null) },
    }))
  }, [state.canvases.length])

  const switchCanvas = useCallback((canvasId) => {
    setState((prev) => ({
      ...prev,
      activeCanvasId: canvasId,
      focus: { active: false, videoNodeId: null, activeTab: 'text', playbackHighlightNodeId: null, selectedNoteId: null, layout: normalizeFocusLayout(null) },
    }))
  }, [])

  const renameCanvas = useCallback((canvasId, name) => {
    setState((prev) => ({
      ...prev,
      canvases: prev.canvases.map((c) => (c.id === canvasId ? { ...c, name } : c)),
    }))
  }, [])

  const deleteCanvas = useCallback((canvasId) => {
    setState((prev) => {
      if (prev.canvases.length <= 1) return prev

      const canvases = prev.canvases.filter((c) => c.id !== canvasId)
      const activeCanvasId =
        prev.activeCanvasId === canvasId ? canvases[0].id : prev.activeCanvasId

      return {
        ...prev,
        canvases,
        activeCanvasId,
        focus: { active: false, videoNodeId: null, activeTab: 'text', playbackHighlightNodeId: null, selectedNoteId: null, layout: normalizeFocusLayout(null) },
      }
    })
  }, [])

  const registerPlayer = useCallback((nodeId, controls) => {
    playerRegistry.current.set(nodeId, controls)
  }, [])

  const unregisterPlayer = useCallback((nodeId) => {
    playerRegistry.current.delete(nodeId)
  }, [])

  const seekVideo = useCallback((nodeId, seconds) => {
    const controls = playerRegistry.current.get(nodeId)
    controls?.seekTo(seconds)
  }, [])

  const getVideoCurrentTime = useCallback((videoNodeId) => {
    const focusPlayerId = `focus-${videoNodeId}`
    const playerId = playerRegistry.current.has(focusPlayerId)
      ? focusPlayerId
      : videoNodeId
    return playerRegistry.current.get(playerId)?.getCurrentTime?.() ?? 0
  }, [])

  const getCheckpointsForVideo = useCallback(
    (videoNodeId) => {
      return activeCanvas.nodes
        .filter(
          (node) =>
            node.type === 'checkpoint' && node.data?.videoNodeId === videoNodeId,
        )
        .map((node) => ({
          id: node.id,
          seconds: node.data.seconds ?? 0,
          content: node.data.content ?? '',
          title: node.data.title,
        }))
        .sort((a, b) => a.seconds - b.seconds)
    },
    [activeCanvas.nodes],
  )

  const getVideoTitle = useCallback(
    (videoNodeId) => {
      const node = activeCanvas.nodes.find((n) => n.id === videoNodeId)
      return node?.data?.title || null
    },
    [activeCanvas.nodes],
  )

  const addCheckpointFromVideo = useCallback(
    (videoNodeId, seconds, content = '', options = {}) => {
      const { favorite = false } = options
      setState((prev) => {
        const canvas = getActiveCanvas(prev)
        const videoNode = canvas.nodes.find((n) => n.id === videoNodeId)
        if (!videoNode) return prev

        const existingCount = canvas.nodes.filter(
          (node) =>
            node.type === 'checkpoint' && node.data?.videoNodeId === videoNodeId,
        ).length

        const checkpointId = generateId()
        const roundedSeconds = Math.round(seconds * 10) / 10
        const videoTitle = videoNode.data?.title || 'Video'

        const checkpointNode = {
          id: checkpointId,
          type: 'checkpoint',
          position: {
            x: videoNode.position.x + 420,
            y: videoNode.position.y + existingCount * 110,
          },
          data: {
            title: formatTimestamp(roundedSeconds),
            seconds: roundedSeconds,
            content,
            videoNodeId,
            videoTitle,
            ...(favorite ? { favorite: true } : {}),
            createdAt: Date.now(),
          },
        }

        return updateActiveCanvas(prev, {
          nodes: [...canvas.nodes, checkpointNode],
        })
      })

      seekVideo(videoNodeId, seconds)
    },
    [seekVideo],
  )

  const seekFromCheckpoint = useCallback(
    (checkpointNodeId) => {
      const checkpoint = activeCanvas.nodes.find((n) => n.id === checkpointNodeId)
      if (!checkpoint?.data?.videoNodeId) return

      const { videoNodeId, seconds } = checkpoint.data
      const focusPlayerId = `focus-${videoNodeId}`
      const playerId = playerRegistry.current.has(focusPlayerId)
        ? focusPlayerId
        : videoNodeId

      seekVideo(playerId, seconds)
      playerRegistry.current.get(playerId)?.play?.()
    },
    [activeCanvas.nodes, seekVideo],
  )

  const getConnectedVideoId = useCallback(
    (nodeId) => {
      const edge = activeCanvas.edges.find(
        (e) => e.source === nodeId || e.target === nodeId,
      )
      if (!edge) return null

      const otherId = edge.source === nodeId ? edge.target : edge.source
      const otherNode = activeCanvas.nodes.find((n) => n.id === otherId)
      if (otherNode?.type !== 'video') return null
      return otherNode.id
    },
    [activeCanvas.edges, activeCanvas.nodes],
  )

  const getConnectedVideoData = useCallback(
    (nodeId) => {
      const videoNodeId = getConnectedVideoId(nodeId)
      if (!videoNodeId) return null
      const node = activeCanvas.nodes.find((n) => n.id === videoNodeId)
      return node ? { nodeId: videoNodeId, videoId: node.data.videoId } : null
    },
    [activeCanvas.nodes, getConnectedVideoId],
  )

  const seekFromTranscript = useCallback(
    (transcriptNodeId, seconds) => {
      const videoNodeId = getConnectedVideoId(transcriptNodeId)
      if (videoNodeId) seekVideo(videoNodeId, seconds)
    },
    [getConnectedVideoId, seekVideo],
  )

  const seekInFocusMode = useCallback(
    (videoNodeId, seconds) => {
      const focusPlayerId = `focus-${videoNodeId}`
      const playerId = playerRegistry.current.has(focusPlayerId)
        ? focusPlayerId
        : videoNodeId

      seekVideo(playerId, seconds)
      playerRegistry.current.get(playerId)?.play?.()
    },
    [seekVideo],
  )

  const getTranscriptForVideo = useCallback(
    (videoNodeId) => {
      const videoNode = activeCanvas.nodes.find((n) => n.id === videoNodeId)
      const videoId = videoNode?.data?.videoId
      if (!videoId) return null

      const connected = activeCanvas.nodes.find((node) => {
        if (node.type !== 'transcript') return false
        if (node.data?.videoId === videoId) return true

        return activeCanvas.edges.some(
          (edge) =>
            (edge.source === node.id && edge.target === videoNodeId) ||
            (edge.target === node.id && edge.source === videoNodeId),
        )
      })

      if (!connected) return null

      return {
        nodeId: connected.id,
        videoId: connected.data?.videoId || videoId,
        segments: connected.data?.segments ?? [],
        status: connected.data?.status ?? 'idle',
      }
    },
    [activeCanvas.nodes, activeCanvas.edges],
  )

  const getFocusNotesForVideo = useCallback(
    (videoNodeId) => {
      return activeCanvas.nodes
        .filter(
          (node) =>
            node.data?.videoNodeId === videoNodeId &&
            ['simpleText', 'checkpoint'].includes(node.type),
        )
        .map((node) => ({
          id: node.id,
          type: node.type,
          videoNodeId: node.data.videoNodeId,
          seconds: node.data.seconds ?? null,
          content: node.data.content ?? '',
          title: node.data.title,
          favorite: Boolean(node.data.favorite),
          createdAt: node.data.createdAt ?? null,
        }))
        .sort((a, b) => {
          if (a.seconds == null && b.seconds == null) return 0
          if (a.seconds == null) return 1
          if (b.seconds == null) return -1
          return a.seconds - b.seconds
        })
    },
    [activeCanvas.nodes],
  )

  const addFocusNote = useCallback(
    (videoNodeId, type, options = {}) => {
      const { seconds = null, content = '', favorite = false } = options

      if (type === 'checkpoint') {
        addCheckpointFromVideo(
          videoNodeId,
          seconds ?? getVideoCurrentTime(videoNodeId),
          content,
          { favorite },
        )
        return
      }

      setState((prev) => {
        const canvas = getActiveCanvas(prev)
        const videoNode = canvas.nodes.find((n) => n.id === videoNodeId)
        if (!videoNode) return prev

        const existingCount = canvas.nodes.filter(
          (node) => node.data?.videoNodeId === videoNodeId,
        ).length

        const noteId = generateId()
        const roundedSeconds =
          seconds != null ? Math.round(seconds * 10) / 10 : null
        const videoTitle = videoNode.data?.title || 'Video'

        const data = {
          title:
            roundedSeconds != null
              ? formatTimestamp(roundedSeconds)
              : getDefaultTitle(type),
          content: type === 'essay' ? plainTextToEssay(content) : content,
          videoNodeId,
          videoTitle,
          ...(roundedSeconds != null ? { seconds: roundedSeconds } : {}),
          ...(favorite ? { favorite: true } : {}),
          createdAt: Date.now(),
        }

        const node = {
          id: noteId,
          type,
          position: {
            x: videoNode.position.x + 440,
            y: videoNode.position.y + existingCount * 100,
          },
          data,
        }

        return updateActiveCanvas(prev, {
          nodes: [...canvas.nodes, node],
        })
      })
    },
    [addCheckpointFromVideo, getVideoCurrentTime],
  )

  const setFocusActiveTab = useCallback((tab) => {
    setState((prev) => ({
      ...prev,
      focus: { ...prev.focus, activeTab: tab },
    }))
  }, [])

  const setFocusLayout = useCallback((layout) => {
    setState((prev) => ({
      ...prev,
      focus: {
        ...prev.focus,
        layout: normalizeFocusLayout(layout),
      },
    }))
  }, [])

  const applyFocusLayoutPreset = useCallback((presetId) => {
    setState((prev) => ({
      ...prev,
      focus: {
        ...prev.focus,
        layout: createLayoutFromPreset(presetId),
      },
    }))
  }, [])

  const setFocusPlaybackHighlight = useCallback((nodeId) => {
    setState((prev) => {
      if (prev.focus?.playbackHighlightNodeId === nodeId) return prev
      return {
        ...prev,
        focus: { ...prev.focus, playbackHighlightNodeId: nodeId },
      }
    })
  }, [])

  const setFocusSelectedNote = useCallback((noteId) => {
    setState((prev) => {
      if (prev.focus?.selectedNoteId === noteId) return prev
      return {
        ...prev,
        focus: { ...prev.focus, selectedNoteId: noteId },
      }
    })
  }, [])

  const enterFocusMode = useCallback((videoNodeId) => {
    setState((prev) => ({
      ...prev,
      focus: {
        active: true,
        videoNodeId,
        activeTab: 'text',
        playbackHighlightNodeId: null,
        selectedNoteId: null,
        layout: prev.focus?.layout ?? normalizeFocusLayout(null),
      },
    }))
  }, [])

  const exitFocusMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      focus: {
        active: false,
        videoNodeId: null,
        activeTab: 'text',
        playbackHighlightNodeId: null,
        selectedNoteId: null,
        layout: prev.focus?.layout ?? normalizeFocusLayout(null),
      },
    }))
  }, [])

  const setSidebarOpen = useCallback((open) => {
    setState((prev) => ({ ...prev, sidebarOpen: open }))
  }, [])

  const focusOnNode = useCallback((nodeId) => {
    setState((prev) => {
      const canvas = getActiveCanvas(prev)
      const node = canvas.nodes.find((n) => n.id === nodeId)
      if (!node) return prev
      return updateActiveCanvas(prev, {
        viewport: {
          x: -node.position.x + 200,
          y: -node.position.y + 120,
          zoom: 1,
        },
      })
    })
  }, [])

  const clearFitViewRequest = useCallback(() => {
    setFitViewRequest(null)
  }, [])

  const generateVideoPlaylist = useCallback(async ({ prompt, center, maxResults = 8 }) => {
    const result = await generatePlaylist(prompt, maxResults)
    const { title, topic, videos } = result

    if (!videos?.length) {
      throw new Error('No videos found for this playlist')
    }

    const anchor =
      center?.x != null && center?.y != null ? center : { x: 400, y: 300 }

    const nodeWidth = 420
    const nodeHeight = 360
    const gap = 48
    const columns = Math.ceil(Math.sqrt(videos.length))

    const tempNodes = videos.map((_, index) => ({
      id: `temp-${index}`,
      type: 'video',
      width: nodeWidth,
      height: nodeHeight,
      data: {},
    }))

    const positions = computeGridPositionsForNewNodes(tempNodes, anchor, columns, gap)

    const nodes = videos.map((video, index) => {
      const position = positions.get(`temp-${index}`) ?? {
        x: anchor.x - nodeWidth / 2,
        y: anchor.y - nodeHeight / 2 + index * (nodeHeight + gap),
      }

      return {
        id: generateId(),
        type: 'video',
        position,
        width: nodeWidth,
        height: nodeHeight,
        data: {
          title: video.title,
          videoId: video.videoId,
          channelTitle: video.channelTitle,
          thumbnailUrl: video.thumbnailUrl,
          description: '',
          playlistIndex: index + 1,
          playlistTopic: topic,
        },
      }
    })

    const canvas = createEmptyCanvas(title)
    canvas.nodes = nodes
    canvas.layoutId = 'free'

    setState((prev) => ({
      ...prev,
      activeCanvasId: canvas.id,
      canvases: [...prev.canvases, canvas],
      focus: {
        active: false,
        videoNodeId: null,
        activeTab: 'text',
        playbackHighlightNodeId: null,
        selectedNoteId: null,
        layout: normalizeFocusLayout(null),
      },
    }))

    setFitViewRequest({
      canvasId: canvas.id,
      nodeIds: nodes.map((node) => node.id),
    })

    return { title, count: nodes.length, canvasId: canvas.id }
  }, [])

  const value = useMemo(
    () => ({
      state,
      activeCanvas,
      focus,
      sidebarOpen,
      draggingNodeId,
      selectedNodeIds,
      selectionLayoutMenuOpen,
      fitViewRequest,
      setDraggingNodeId,
      setSelectedNodeIds,
      setSelectionLayoutMenuOpen,
      toggleSelectionLayoutMenu,
      applySelectionLayout,
      setNodes,
      setEdges,
      setViewport,
      updateNodeData,
      updateNodeSize,
      removeNode,
      addNode,
      addNodeWithLayout,
      addVideoNode,
      resolveNodePlacement,
      setCanvasLayout,
      applyCanvasLayout,
      clearNodeLayoutSlot,
      createCanvas,
      switchCanvas,
      renameCanvas,
      deleteCanvas,
      registerPlayer,
      unregisterPlayer,
      seekVideo,
      seekFromTranscript,
      seekInFocusMode,
      getTranscriptForVideo,
      getFocusNotesForVideo,
      addFocusNote,
      setFocusActiveTab,
      setFocusLayout,
      applyFocusLayoutPreset,
      getConnectedVideoData,
      getCheckpointsForVideo,
      getVideoTitle,
      addCheckpointFromVideo,
      seekFromCheckpoint,
      getVideoCurrentTime,
      enterFocusMode,
      exitFocusMode,
      setFocusPlaybackHighlight,
      setFocusSelectedNote,
      setSidebarOpen,
      focusOnNode,
      generateVideoPlaylist,
      clearFitViewRequest,
    }),
    [
      state,
      activeCanvas,
      focus,
      sidebarOpen,
      draggingNodeId,
      selectedNodeIds,
      selectionLayoutMenuOpen,
      fitViewRequest,
      setDraggingNodeId,
      setSelectedNodeIds,
      setSelectionLayoutMenuOpen,
      toggleSelectionLayoutMenu,
      applySelectionLayout,
      setNodes,
      setEdges,
      setViewport,
      updateNodeData,
      updateNodeSize,
      removeNode,
      addNode,
      addNodeWithLayout,
      addVideoNode,
      resolveNodePlacement,
      setCanvasLayout,
      applyCanvasLayout,
      clearNodeLayoutSlot,
      createCanvas,
      switchCanvas,
      renameCanvas,
      deleteCanvas,
      registerPlayer,
      unregisterPlayer,
      seekVideo,
      seekFromTranscript,
      seekInFocusMode,
      getTranscriptForVideo,
      getFocusNotesForVideo,
      addFocusNote,
      setFocusActiveTab,
      setFocusLayout,
      applyFocusLayoutPreset,
      getConnectedVideoData,
      getCheckpointsForVideo,
      getVideoTitle,
      addCheckpointFromVideo,
      seekFromCheckpoint,
      getVideoCurrentTime,
      enterFocusMode,
      exitFocusMode,
      setFocusPlaybackHighlight,
      setFocusSelectedNote,
      setSidebarOpen,
      focusOnNode,
      generateVideoPlaylist,
      clearFitViewRequest,
      fitViewRequest,
    ],
  )

  return <VoidTubeContext.Provider value={value}>{children}</VoidTubeContext.Provider>
}

export function useVoidTubeStore() {
  const ctx = useContext(VoidTubeContext)
  if (!ctx) throw new Error('useVoidTubeStore must be used within VoidTubeProvider')
  return ctx
}

function getDefaultTitle(type) {
  switch (type) {
    case 'simpleText':
      return 'Quick Note'
    case 'essay':
      return 'Essay'
    case 'transcript':
      return 'Transcript'
    case 'checkpoint':
      return 'Checkpoint'
    default:
      return 'Note'
  }
}

function plainTextToEssay(text) {
  if (!text) {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }

  return {
    type: 'doc',
    content: text.split('\n').map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  }
}

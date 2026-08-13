import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { enableIframeDragGuard, disableIframeDragGuard } from './IframeDragGuard'
import { useVoidTubeStore } from '../stores/useVoidTubeStore'
import { getNodeSize } from '../lib/nodeSizing'
import SelectionLayoutMenu from './SelectionLayoutMenu'
import CheckpointNode from './nodes/CheckpointNode'
import EssayNode from './nodes/EssayNode'
import SimpleTextNode from './nodes/SimpleTextNode'
import TranscriptNode from './nodes/TranscriptNode'
import VideoNode from './nodes/VideoNode'

const nodeTypes = {
  video: VideoNode,
  simpleText: SimpleTextNode,
  essay: EssayNode,
  transcript: TranscriptNode,
  checkpoint: CheckpointNode,
}

function FocusBoardSync() {
  const { focus, activeCanvas } = useVoidTubeStore()
  const { setCenter, getZoom } = useReactFlow()
  const lastHighlightRef = useRef(null)

  useEffect(() => {
    if (!focus.active || !focus.playbackHighlightNodeId) return

    if (lastHighlightRef.current === focus.playbackHighlightNodeId) return
    lastHighlightRef.current = focus.playbackHighlightNodeId

    const node = activeCanvas.nodes.find((n) => n.id === focus.playbackHighlightNodeId)
    if (!node) return

    const { width, height } = getNodeSize(node)
    setCenter(node.position.x + width / 2, node.position.y + height / 2, {
      zoom: getZoom(),
      duration: 520,
    })
  }, [focus.active, focus.playbackHighlightNodeId, activeCanvas.nodes, setCenter, getZoom])

  useEffect(() => {
    if (!focus.active) lastHighlightRef.current = null
  }, [focus.active])

  return null
}

function PlaylistFitViewSync() {
  const { fitViewRequest, activeCanvas, clearFitViewRequest } = useVoidTubeStore()
  const { fitView } = useReactFlow()

  useEffect(() => {
    if (!fitViewRequest) return
    if (fitViewRequest.canvasId !== activeCanvas.id) return
    if (!fitViewRequest.nodeIds?.length) {
      clearFitViewRequest()
      return
    }

    const frame = requestAnimationFrame(() => {
      fitView({
        nodes: fitViewRequest.nodeIds.map((id) => ({ id })),
        padding: 0.18,
        duration: 480,
        maxZoom: 1,
      })
      clearFitViewRequest()
    })

    return () => cancelAnimationFrame(frame)
  }, [fitViewRequest, activeCanvas.id, fitView, clearFitViewRequest])

  return null
}

export default function VoidFlowCanvas() {
  const {
    focus,
    activeCanvas,
    setNodes,
    setEdges,
    setViewport,
    setDraggingNodeId,
    clearNodeLayoutSlot,
    setSelectedNodeIds,
    setSelectionLayoutMenuOpen,
  } = useVoidTubeStore()
  const { setViewport: rfSetViewport } = useReactFlow()

  useEffect(() => {
    const vp = activeCanvas.viewport
    rfSetViewport({ x: vp.x, y: vp.y, zoom: vp.zoom }, { duration: 0 })
    setSelectedNodeIds([])
  }, [activeCanvas.id, rfSetViewport, setSelectedNodeIds])

  const flowNodes = useMemo(
    () =>
      activeCanvas.nodes
        .filter((node) => !node.hidden)
        .map((node) => {
          const classes = []
          if (node.data?.favorite) classes.push('node-favorite')
          if (focus.active && node.id === focus.playbackHighlightNodeId) {
            classes.push('playback-highlight')
          }
          if (classes.length > 0) {
            const className = [node.className, ...classes].filter(Boolean).join(' ')
            return { ...node, className }
          }
          return node
        }),
    [activeCanvas.nodes, focus.active, focus.playbackHighlightNodeId],
  )

  const onNodesChange = useCallback(
    (changes) => {
      const hasPositionDrag = changes.some((c) => c.type === 'position' && c.dragging)
      let next = applyNodeChanges(changes, flowNodes)

      if (hasPositionDrag) {
        next = next.map((node) => {
          const dragging = changes.some(
            (c) => c.id === node.id && c.type === 'position' && c.dragging,
          )
          if (!dragging) return node
          return {
            ...node,
            className: '',
            data: { ...node.data, layoutSlotId: null },
          }
        })
      }

      setNodes(next)
    },
    [flowNodes, setNodes],
  )

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges(applyEdgeChanges(changes, activeCanvas.edges))
    },
    [activeCanvas.edges, setEdges],
  )

  const onConnect = useCallback(
    (connection) => {
      setEdges(addEdge({ ...connection, id: crypto.randomUUID() }, activeCanvas.edges))
    },
    [activeCanvas.edges, setEdges],
  )

  const onMoveEnd = useCallback(
    (_event, viewport) => {
      disableIframeDragGuard()
      setViewport(viewport)
    },
    [setViewport],
  )

  const onMoveStart = useCallback(() => {
    enableIframeDragGuard()
  }, [])

  const onNodeDragStart = useCallback(
    (_event, node) => {
      enableIframeDragGuard()
      setDraggingNodeId(node.id)
    },
    [setDraggingNodeId],
  )

  const onNodeDragStop = useCallback(
    (_event, node) => {
      disableIframeDragGuard()
      setDraggingNodeId(null)
      clearNodeLayoutSlot(node.id)
    },
    [setDraggingNodeId, clearNodeLayoutSlot],
  )

  const onSelectionChange = useCallback(
    ({ nodes }) => {
      const ids = nodes.map((node) => node.id)
      setSelectedNodeIds(ids)
      if (ids.length >= 2) {
        setSelectionLayoutMenuOpen(true)
      }
    },
    [setSelectedNodeIds, setSelectionLayoutMenuOpen],
  )

  const defaultEdgeOptions = useMemo(
    () => ({
      style: { stroke: 'rgb(208 238 255 / 0.55)', strokeWidth: 2 },
      animated: false,
    }),
    [],
  )

  const visibleNodeCount = flowNodes.length

  return (
    <div
      className={`void-flow-canvas relative h-full w-full${focus.active ? ' focus-board-visible' : ''}`}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={activeCanvas.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveStart={onMoveStart}
        onMoveEnd={onMoveEnd}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        selectionOnDrag
        selectionMode="partial"
        panOnDrag={[1, 2]}
        panActivationKeyCode="Space"
        autoPanOnSelection
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView={visibleNodeCount === 0}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <FocusBoardSync />
        <PlaylistFitViewSync />
        <Background gap={28} size={1} color="oklch(0.88 0.01 247)" />
        <Controls
          className="!border-border !bg-card !shadow-md [&>button]:!border-border [&>button]:!bg-card [&>button]:!fill-muted-foreground [&>button:hover]:!bg-accent"
        />
        <MiniMap
          nodeColor={() => '#D0EEFF'}
          maskColor="oklch(0.96 0.005 247 / 0.75)"
          className="!border-border !bg-card"
        />
      </ReactFlow>

      <SelectionLayoutMenu />

      {visibleNodeCount === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-sm rounded-2xl border border-border bg-card/90 px-6 py-5 text-center shadow-md backdrop-blur-md">
            <p className="text-sm font-medium text-foreground">Empty playlist</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Search for a YouTube video above, pick a layout in the header, and add notes
              from the dock bar. Multi-select: drag a selection box or ⌘/Ctrl+click.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function useCanvasCenter() {
  const { screenToFlowPosition } = useReactFlow()

  return useCallback(() => {
    const el = document.querySelector('.void-flow-canvas')
    const rect = el?.getBoundingClientRect()
    if (!rect) return { x: 400, y: 300 }

    const position = screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })

    if (position?.x == null || position?.y == null) {
      return { x: 400, y: 300 }
    }

    return position
  }, [screenToFlowPosition])
}

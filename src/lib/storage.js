import { DEFAULT_FOCUS_LAYOUT, normalizeFocusLayout } from './focusLayout.js'

export const STORAGE_KEY = 'voidtube-v2'

export function generateId() {
  return crypto.randomUUID()
}

export function createEmptyCanvas(name = 'Untitled') {
  return {
    id: generateId(),
    name,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    layoutId: 'free',
    layoutAnchor: null,
  }
}

export function createDefaultState() {
  const canvas = createEmptyCanvas()
  return {
    activeCanvasId: canvas.id,
    canvases: [canvas],
    focus: {
      active: false,
      videoNodeId: null,
      activeTab: 'text',
      playbackHighlightNodeId: null,
      selectedNoteId: null,
      layout: DEFAULT_FOCUS_LAYOUT,
    },
    sidebarOpen: true,
  }
}

function stripFolderData(nodes) {
  return nodes
    .filter((node) => node.type !== 'folder')
    .map((node) => {
      const { folderId, _folderSavedPosition, _folderPeek, _folderRevealIndex, ...restData } =
        node.data ?? {}
      return {
        ...node,
        hidden: false,
        data: restData,
      }
    })
}

function migrateState(parsed) {
  const canvases = (parsed.canvases ?? []).map((canvas) => {
    const nodes = stripFolderData(canvas.nodes ?? []).map((node) => {
      const data = { ...node.data, layoutSlotId: node.data?.layoutSlotId ?? null }

      if (node.type === 'video') {
        const width = node.width ?? node.style?.width ?? node.data?.width ?? 420
        const height = node.height ?? node.style?.height ?? node.data?.height ?? 360
        return {
          ...node,
          width,
          height,
          data: { ...data, width, height },
          style: { ...node.style, width, height },
        }
      }

      if (node.type === 'transcript' && node.data?.error) {
        const err = String(node.data.error)
        if (err.includes('TRANSCRIPT_PROXY') || err.includes('blocks cloud IPs')) {
          return {
            ...node,
            data: { ...data, error: null, status: 'idle' },
          }
        }
      }

      return { ...node, data }
    })

    return {
      ...canvas,
      layoutId: canvas.layoutId ?? 'free',
      layoutAnchor: canvas.layoutAnchor ?? null,
      nodes,
    }
  })

  return {
    activeCanvasId: parsed.activeCanvasId,
    canvases,
    focus: {
      active: parsed.focus?.active ?? false,
      videoNodeId: parsed.focus?.videoNodeId ?? null,
      activeTab: parsed.focus?.activeTab ?? (parsed.focus?.showTranscript ? 'transcript' : 'text'),
      playbackHighlightNodeId: parsed.focus?.playbackHighlightNodeId ?? null,
      selectedNoteId: parsed.focus?.selectedNoteId ?? null,
      layout: normalizeFocusLayout(parsed.focus?.layout),
    },
    sidebarOpen: parsed.sidebarOpen ?? true,
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultState()

    const parsed = JSON.parse(raw)
    if (!parsed?.canvases?.length || !parsed.activeCanvasId) {
      return createDefaultState()
    }

    return migrateState(parsed)
  } catch {
    return createDefaultState()
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('Failed to save state:', err)
  }
}

export function getActiveCanvas(state) {
  return state.canvases.find((c) => c.id === state.activeCanvasId) ?? state.canvases[0]
}

export function updateActiveCanvas(state, updates) {
  return {
    ...state,
    canvases: state.canvases.map((canvas) =>
      canvas.id === state.activeCanvasId ? { ...canvas, ...updates } : canvas,
    ),
  }
}

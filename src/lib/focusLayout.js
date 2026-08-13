export const FOCUS_PANEL_IDS = ['video', 'transcript', 'notes']

export const FOCUS_PANEL_LABELS = {
  video: 'Video',
  transcript: 'Transcript',
  notes: 'Notes',
}

/** @typedef {'video' | 'transcript' | 'notes'} FocusPanelId */
/** @typedef {'horizontal' | 'vertical'} SplitDirection */

/**
 * @typedef {Object} FocusPanelLeaf
 * @property {'panel'} type
 * @property {FocusPanelId} panelId
 *
 * @typedef {Object} FocusSplitNode
 * @property {'split'} type
 * @property {SplitDirection} direction
 * @property {number} ratio
 * @property {FocusLayoutNode} first
 * @property {FocusLayoutNode} second
 *
 * @typedef {FocusPanelLeaf | FocusSplitNode} FocusLayoutNode
 */

export const FOCUS_LAYOUT_PRESETS = {
  classic: {
    id: 'classic',
    label: 'Classic',
    description: 'Video + transcript left, notes right',
    tree: {
      type: 'split',
      direction: 'horizontal',
      ratio: 0.62,
      first: {
        type: 'split',
        direction: 'vertical',
        ratio: 0.44,
        first: { type: 'panel', panelId: 'video' },
        second: { type: 'panel', panelId: 'transcript' },
      },
      second: { type: 'panel', panelId: 'notes' },
    },
  },
  notesLeft: {
    id: 'notesLeft',
    label: 'Notes left',
    description: 'Notes left, video + transcript right',
    tree: {
      type: 'split',
      direction: 'horizontal',
      ratio: 0.38,
      first: { type: 'panel', panelId: 'notes' },
      second: {
        type: 'split',
        direction: 'vertical',
        ratio: 0.44,
        first: { type: 'panel', panelId: 'video' },
        second: { type: 'panel', panelId: 'transcript' },
      },
    },
  },
  videoLarge: {
    id: 'videoLarge',
    label: 'Large video',
    description: 'Large video on top, transcript + notes below',
    tree: {
      type: 'split',
      direction: 'vertical',
      ratio: 0.62,
      first: { type: 'panel', panelId: 'video' },
      second: {
        type: 'split',
        direction: 'horizontal',
        ratio: 0.55,
        first: { type: 'panel', panelId: 'transcript' },
        second: { type: 'panel', panelId: 'notes' },
      },
    },
  },
  transcriptFocus: {
    id: 'transcriptFocus',
    label: 'Transcript bottom',
    description: 'Video + notes on top, wide transcript below',
    tree: {
      type: 'split',
      direction: 'vertical',
      ratio: 0.52,
      first: {
        type: 'split',
        direction: 'horizontal',
        ratio: 0.58,
        first: { type: 'panel', panelId: 'video' },
        second: { type: 'panel', panelId: 'notes' },
      },
      second: { type: 'panel', panelId: 'transcript' },
    },
  },
}

export const DEFAULT_FOCUS_LAYOUT = {
  presetId: 'classic',
  tree: cloneTree(FOCUS_LAYOUT_PRESETS.classic.tree),
}

export function cloneTree(node) {
  if (node.type === 'panel') return { ...node }
  return {
    ...node,
    first: cloneTree(node.first),
    second: cloneTree(node.second),
  }
}

export function getFocusLayoutPreset(presetId) {
  return FOCUS_LAYOUT_PRESETS[presetId] ?? FOCUS_LAYOUT_PRESETS.classic
}

export function createLayoutFromPreset(presetId) {
  const preset = getFocusLayoutPreset(presetId)
  return {
    presetId: preset.id,
    tree: cloneTree(preset.tree),
  }
}

export function normalizeFocusLayout(layout) {
  if (!layout?.tree) return createLayoutFromPreset('classic')

  const presetId = layout.presetId ?? 'custom'
  const tree = cloneTree(layout.tree)
  normalizeSplitRatios(tree)
  return { presetId, tree }
}

function normalizeSplitRatios(node) {
  if (node.type === 'panel') return

  node.ratio = clampRatio(node.ratio ?? 0.5)
  normalizeSplitRatios(node.first)
  normalizeSplitRatios(node.second)
}

export function clampRatio(value) {
  return Math.min(0.85, Math.max(0.15, value))
}

/**
 * @param {FocusLayoutNode} node
 * @param {string[]} path
 * @param {number} ratio
 */
export function setSplitRatioAtPath(node, path, ratio) {
  if (path.length === 0) {
    if (node.type !== 'split') return node
    return { ...node, ratio: clampRatio(ratio) }
  }

  if (node.type === 'panel') return node

  const [head, ...rest] = path
  if (head === 'first') {
    return { ...node, first: setSplitRatioAtPath(node.first, rest, ratio) }
  }
  if (head === 'second') {
    return { ...node, second: setSplitRatioAtPath(node.second, rest, ratio) }
  }

  return node
}

/**
 * @param {FocusLayoutNode} node
 * @param {FocusPanelId} panelA
 * @param {FocusPanelId} panelB
 */
export function swapPanelsInTree(node, panelA, panelB) {
  if (panelA === panelB) return node

  let idA = null
  let idB = null

  const walk = (current) => {
    if (current.type === 'panel') {
      if (current.panelId === panelA) idA = current.panelId
      if (current.panelId === panelB) idB = current.panelId
      return
    }
    walk(current.first)
    walk(current.second)
  }

  walk(node)
  if (!idA || !idB) return node

  const replace = (current) => {
    if (current.type === 'panel') {
      if (current.panelId === panelA) return { ...current, panelId: panelB }
      if (current.panelId === panelB) return { ...current, panelId: panelA }
      return current
    }

    return {
      ...current,
      first: replace(current.first),
      second: replace(current.second),
    }
  }

  return replace(node)
}

/**
 * @param {FocusLayoutNode} node
 * @param {FocusPanelId} panelId
 * @returns {string[] | null}
 */
export function findPanelPath(node, panelId, path = []) {
  if (node.type === 'panel') {
    return node.panelId === panelId ? path : null
  }

  return (
    findPanelPath(node.first, panelId, [...path, 'first']) ??
    findPanelPath(node.second, panelId, [...path, 'second'])
  )
}

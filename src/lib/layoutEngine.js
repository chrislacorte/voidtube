import { DEFAULT_SLOT_INSET, getCanvasLayout, isLayoutActive, slotAcceptsType } from './canvasLayouts'
import { getNodeSize } from './nodeSizing'
import { DEFAULT_SELECTION_GAP, getSelectionLayout } from './selectionLayouts'

const OVERFLOW_OFFSET_X = 40
const OVERFLOW_OFFSET_Y = 36

export function computeLayoutAnchor(fallbackCenter, layoutAnchor, layout) {
  if (layoutAnchor?.x != null && layoutAnchor?.y != null) {
    return layoutAnchor
  }
  if (!layout?.width || !layout?.height) {
    return fallbackCenter
  }
  return {
    x: fallbackCenter.x - layout.width / 2,
    y: fallbackCenter.y - layout.height / 2,
  }
}

export function slotToPosition(slot, layout, anchor) {
  const { region, defaultSize } = slot
  const layoutW = layout.width
  const layoutH = layout.height
  const inset = layout.slotInset ?? DEFAULT_SLOT_INSET

  const x = anchor.x + region.x * layoutW + inset
  const y = anchor.y + region.y * layoutH + inset

  return {
    position: { x, y },
    size: defaultSize ?? null,
    regionSize: {
      width: Math.max(80, region.w * layoutW - inset * 2),
      height: Math.max(80, region.h * layoutH - inset * 2),
    },
  }
}

export function isLayoutEligibleNode(node) {
  if (!node || node.hidden) return false
  return true
}

export function getOccupiedSlotIds(nodes) {
  const occupied = new Set()
  for (const node of nodes) {
    if (!isLayoutEligibleNode(node)) continue
    if (node.data?.layoutSlotId) occupied.add(node.data.layoutSlotId)
  }
  return occupied
}

export function findSlotForType(layout, nodeType, occupiedSlotIds) {
  if (!layout?.slots?.length) return null

  for (const slot of layout.slots) {
    if (occupiedSlotIds.has(slot.id)) continue
    if (slotAcceptsType(slot, nodeType)) return slot
  }

  for (const slot of layout.slots) {
    if (occupiedSlotIds.has(slot.id)) continue
    if (slotAcceptsType(slot, 'any')) return slot
  }

  return null
}

export function assignNodesToLayout(nodes, layout, anchor) {
  const eligible = nodes.filter((n) => isLayoutEligibleNode(n))
  const assignments = new Map()
  const occupied = new Set()

  for (const node of eligible) {
    const slotId = node.data?.layoutSlotId
    if (!slotId || occupied.has(slotId)) continue
    const slot = layout.slots.find((s) => s.id === slotId)
    if (slot && slotAcceptsType(slot, node.type)) {
      assignments.set(node.id, slotId)
      occupied.add(slotId)
    }
  }

  const typePriority = ['video', 'transcript', 'essay', 'simpleText', 'checkpoint']
  const sorted = [...eligible]
    .filter((n) => !assignments.has(n.id))
    .sort((a, b) => {
      const ai = typePriority.indexOf(a.type)
      const bi = typePriority.indexOf(b.type)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

  for (const node of sorted) {
    const slot = findSlotForType(layout, node.type, occupied)
    if (!slot) {
      const overflow = layout.slots.find((s) => slotAcceptsType(s, 'any') || s.id === 'notes')
      if (overflow) {
        assignments.set(node.id, overflow.id)
      }
      continue
    }
    assignments.set(node.id, slot.id)
    occupied.add(slot.id)
  }

  return assignments
}

export function applyLayoutPositions(nodes, assignments, layout, anchor) {
  const slotOverflow = new Map()

  return nodes.map((node) => {
    if (!isLayoutEligibleNode(node)) return node

    const slotId = assignments.get(node.id)
    if (!slotId) {
      return {
        ...node,
        data: { ...node.data, layoutSlotId: null },
      }
    }

    const slot = layout.slots.find((s) => s.id === slotId)
    if (!slot) return node

    const overflowIndex = slotOverflow.get(slotId) ?? 0
    slotOverflow.set(slotId, overflowIndex + 1)

    const { position, size, regionSize } = slotToPosition(slot, layout, anchor)
    const nodeSize = getNodeSize(node)
    const offsetX = overflowIndex * OVERFLOW_OFFSET_X
    const offsetY = overflowIndex * OVERFLOW_OFFSET_Y

    const centeredX =
      position.x + Math.max(0, (regionSize.width - (size?.width ?? nodeSize.width)) / 2) + offsetX
    const centeredY =
      position.y + Math.max(0, (regionSize.height - (size?.height ?? nodeSize.height)) / 2) + offsetY

    const stylePatch =
      size && node.type === 'video'
        ? { style: { ...node.style, width: size.width, height: size.height } }
        : {}

    const dimensionPatch =
      size && node.type === 'video'
        ? { width: size.width, height: size.height }
        : {}

    const dataPatch =
      size && node.type === 'video'
        ? { width: size.width, height: size.height }
        : {}

    return {
      ...node,
      ...dimensionPatch,
      ...stylePatch,
      position: { x: centeredX, y: centeredY },
      className: 'layout-animate',
      data: {
        ...node.data,
        ...dataPatch,
        layoutSlotId: slotId,
      },
    }
  })
}

export function resolvePlacementForType({
  layoutId,
  nodeType,
  nodes,
  fallbackCenter,
  layoutAnchor,
}) {
  if (!isLayoutActive(layoutId)) {
    return { position: fallbackCenter, layoutSlotId: null, size: null }
  }

  const layout = getCanvasLayout(layoutId)
  const anchor = computeLayoutAnchor(fallbackCenter, layoutAnchor, layout)
  const occupied = getOccupiedSlotIds(nodes)
  const slot = findSlotForType(layout, nodeType, occupied)

  if (!slot) {
    return { position: fallbackCenter, layoutSlotId: null, size: null }
  }

  const { position, size, regionSize } = slotToPosition(slot, layout, anchor)
  const nodeW = size?.width ?? 320
  const nodeH = size?.height ?? 200

  return {
    position: {
      x: position.x + Math.max(0, (regionSize.width - nodeW) / 2),
      y: position.y + Math.max(0, (regionSize.height - nodeH) / 2),
    },
    layoutSlotId: slot.id,
    size,
  }
}

export function applyLayoutToNodes({
  nodes,
  layoutId,
  fallbackCenter,
  layoutAnchor,
}) {
  if (!isLayoutActive(layoutId)) return nodes

  const layout = getCanvasLayout(layoutId)
  const anchor = computeLayoutAnchor(fallbackCenter, layoutAnchor, layout)
  const assignments = assignNodesToLayout(nodes, layout, anchor)
  return applyLayoutPositions(nodes, assignments, layout, anchor)
}

export function computeSelectionBounds(nodes, selectedIds) {
  const idSet = new Set(selectedIds)
  const selected = nodes.filter((node) => idSet.has(node.id) && !node.hidden)
  if (selected.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of selected) {
    const { width, height } = getNodeSize(node)
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + width)
    maxY = Math.max(maxY, node.position.y + height)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

function sortNodesForSelectionLayout(nodes) {
  return [...nodes].sort((a, b) => {
    const dy = a.position.y - b.position.y
    if (Math.abs(dy) > 24) return dy
    return a.position.x - b.position.x
  })
}

function computeHorizontalPositions(nodes, center, gap = DEFAULT_SELECTION_GAP) {
  const sorted = sortNodesForSelectionLayout(nodes)
  const sizes = sorted.map((node) => getNodeSize(node))
  const totalWidth =
    sizes.reduce((sum, size) => sum + size.width, 0) +
    (sorted.length - 1) * gap

  let x = center.x - totalWidth / 2
  const positions = new Map()

  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i]
    const size = sizes[i]
    positions.set(node.id, {
      x,
      y: center.y - size.height / 2,
    })
    x += size.width + gap
  }

  return positions
}

function computeVerticalPositions(nodes, center, gap = DEFAULT_SELECTION_GAP) {
  const sorted = sortNodesForSelectionLayout(nodes)
  const sizes = sorted.map((node) => getNodeSize(node))
  const totalHeight =
    sizes.reduce((sum, size) => sum + size.height, 0) +
    (sorted.length - 1) * gap

  let y = center.y - totalHeight / 2
  const positions = new Map()

  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i]
    const size = sizes[i]
    positions.set(node.id, {
      x: center.x - size.width / 2,
      y,
    })
    y += size.height + gap
  }

  return positions
}

function computeGridPositions(nodes, center, columns, gap = DEFAULT_SELECTION_GAP) {
  const sorted = sortNodesForSelectionLayout(nodes)
  const sizes = sorted.map((node) => getNodeSize(node))
  const cols = Math.max(1, columns)
  const rows = Math.ceil(sorted.length / cols)

  const rowHeights = []
  const colWidths = []

  for (let row = 0; row < rows; row++) {
    let maxHeight = 0
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col
      if (index >= sorted.length) break
      maxHeight = Math.max(maxHeight, sizes[index].height)
    }
    rowHeights.push(maxHeight)
  }

  for (let col = 0; col < cols; col++) {
    let maxWidth = 0
    for (let row = 0; row < rows; row++) {
      const index = row * cols + col
      if (index >= sorted.length) break
      maxWidth = Math.max(maxWidth, sizes[index].width)
    }
    colWidths.push(maxWidth)
  }

  const totalWidth =
    colWidths.reduce((sum, width) => sum + width, 0) + (cols - 1) * gap
  const totalHeight =
    rowHeights.reduce((sum, height) => sum + height, 0) + (rows - 1) * gap

  const positions = new Map()
  let y = center.y - totalHeight / 2

  for (let row = 0; row < rows; row++) {
    let x = center.x - totalWidth / 2
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col
      if (index >= sorted.length) break

      const node = sorted[index]
      const size = sizes[index]
      positions.set(node.id, {
        x: x + (colWidths[col] - size.width) / 2,
        y: y + (rowHeights[row] - size.height) / 2,
      })
      x += colWidths[col] + gap
    }
    y += rowHeights[row] + gap
  }

  return positions
}

/** Grid positions for newly created nodes (before they exist on canvas). Uses array order. */
export function computeGridPositionsForNewNodes(nodes, center, columns, gap = DEFAULT_SELECTION_GAP) {
  const anchor =
    center?.x != null && center?.y != null ? center : { x: 400, y: 300 }

  if (!nodes?.length) return new Map()

  const sizes = nodes.map((node) => getNodeSize(node))
  const cols = Math.max(1, columns)
  const rows = Math.ceil(nodes.length / cols)

  const rowHeights = []
  const colWidths = []

  for (let row = 0; row < rows; row++) {
    let maxHeight = 0
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col
      if (index >= nodes.length) break
      maxHeight = Math.max(maxHeight, sizes[index].height)
    }
    rowHeights.push(maxHeight)
  }

  for (let col = 0; col < cols; col++) {
    let maxWidth = 0
    for (let row = 0; row < rows; row++) {
      const index = row * cols + col
      if (index >= nodes.length) break
      maxWidth = Math.max(maxWidth, sizes[index].width)
    }
    colWidths.push(maxWidth)
  }

  const totalWidth =
    colWidths.reduce((sum, width) => sum + width, 0) + (cols - 1) * gap
  const totalHeight =
    rowHeights.reduce((sum, height) => sum + height, 0) + (rows - 1) * gap

  const positions = new Map()
  let y = anchor.y - totalHeight / 2

  for (let row = 0; row < rows; row++) {
    let x = anchor.x - totalWidth / 2
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col
      if (index >= nodes.length) break

      const node = nodes[index]
      const size = sizes[index]
      positions.set(node.id, {
        x: x + (colWidths[col] - size.width) / 2,
        y: y + (rowHeights[row] - size.height) / 2,
      })
      x += colWidths[col] + gap
    }
    y += rowHeights[row] + gap
  }

  return positions
}

function computeStaggerPositions(nodes, center, gap = DEFAULT_SELECTION_GAP) {
  const sorted = sortNodesForSelectionLayout(nodes)
  const sizes = sorted.map((node) => getNodeSize(node))
  const rowOffset = gap * 0.65
  const totalWidth =
    sizes.reduce((sum, size) => sum + size.width, 0) + (sorted.length - 1) * gap

  let x = center.x - totalWidth / 2
  const positions = new Map()

  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i]
    const size = sizes[i]
    const yOffset = i % 2 === 0 ? -rowOffset : rowOffset
    positions.set(node.id, {
      x,
      y: center.y - size.height / 2 + yOffset,
    })
    x += size.width + gap
  }

  return positions
}

function computePyramidPositions(nodes, center, gap = DEFAULT_SELECTION_GAP) {
  const sorted = sortNodesForSelectionLayout(nodes)
  const sizeById = new Map(sorted.map((node) => [node.id, getNodeSize(node)]))
  const positions = new Map()

  const rows = []
  let index = 0
  let rowSize = 1
  while (index < sorted.length) {
    rows.push(sorted.slice(index, index + rowSize))
    index += rowSize
    rowSize = Math.min(rowSize + 1, 3)
  }

  const rowHeights = rows.map((row) =>
    Math.max(...row.map((node) => sizeById.get(node.id).height)),
  )
  const totalHeight =
    rowHeights.reduce((sum, h) => sum + h, 0) + (rows.length - 1) * gap

  let y = center.y - totalHeight / 2

  rows.forEach((row, rowIndex) => {
    const rowWidth =
      row.reduce((sum, node) => sum + sizeById.get(node.id).width, 0) +
      (row.length - 1) * gap
    let x = center.x - rowWidth / 2
    const rowHeight = rowHeights[rowIndex]

    row.forEach((node) => {
      const size = sizeById.get(node.id)
      positions.set(node.id, {
        x,
        y: y + (rowHeight - size.height) / 2,
      })
      x += size.width + gap
    })

    y += rowHeight + gap
  })

  return positions
}

function computeSelectionPositions(selectedNodes, layout) {
  const center = computeSelectionBounds(selectedNodes, selectedNodes.map((node) => node.id))
  if (!center) return new Map()

  const anchor = { x: center.centerX, y: center.centerY }
  const gap = layout.gap ?? DEFAULT_SELECTION_GAP

  switch (layout.type) {
    case 'horizontal':
      return computeHorizontalPositions(selectedNodes, anchor, gap)
    case 'vertical':
      return computeVerticalPositions(selectedNodes, anchor, gap)
    case 'grid':
      return computeGridPositions(selectedNodes, anchor, layout.columns ?? 2, gap)
    case 'compactGrid':
      return computeGridPositions(
        selectedNodes,
        anchor,
        Math.ceil(Math.sqrt(selectedNodes.length)),
        gap,
      )
    case 'stagger':
      return computeStaggerPositions(selectedNodes, anchor, gap)
    case 'pyramid':
      return computePyramidPositions(selectedNodes, anchor, gap)
    default:
      return new Map()
  }
}

export function applySelectionLayoutToNodes(nodes, selectedIds, layoutId) {
  const layout = getSelectionLayout(layoutId)
  if (!layout) return nodes

  const idSet = new Set(selectedIds)
  const selected = nodes.filter((node) => idSet.has(node.id) && isLayoutEligibleNode(node))
  if (selected.length < 2) return nodes

  const positions = computeSelectionPositions(selected, layout)
  if (positions.size === 0) return nodes

  return nodes.map((node) => {
    const position = positions.get(node.id)
    if (!position) return node

    return {
      ...node,
      position,
      className: 'layout-animate',
      data: {
        ...node.data,
        layoutSlotId: null,
      },
    }
  })
}

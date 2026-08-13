export const DEFAULT_SELECTION_GAP = 48

export const SELECTION_LAYOUTS = [
  {
    id: 'grid2x2',
    name: '2×2 Grid',
    description: 'Two columns, even grid.',
    type: 'grid',
    columns: 2,
    gap: 48,
    previewCells: [
      { x: 0.06, y: 0.1, w: 0.38, h: 0.34 },
      { x: 0.56, y: 0.1, w: 0.38, h: 0.34 },
      { x: 0.06, y: 0.56, w: 0.38, h: 0.34 },
      { x: 0.56, y: 0.56, w: 0.38, h: 0.34 },
    ],
  },
  {
    id: 'grid3',
    name: '3 Columns',
    description: 'Three columns with more spacing.',
    type: 'grid',
    columns: 3,
    gap: 44,
    previewCells: [
      { x: 0.04, y: 0.12, w: 0.26, h: 0.34 },
      { x: 0.37, y: 0.12, w: 0.26, h: 0.34 },
      { x: 0.7, y: 0.12, w: 0.26, h: 0.34 },
      { x: 0.04, y: 0.56, w: 0.26, h: 0.34 },
      { x: 0.37, y: 0.56, w: 0.26, h: 0.34 },
      { x: 0.7, y: 0.56, w: 0.26, h: 0.34 },
    ],
  },
  {
    id: 'horizontal',
    name: 'Row',
    description: 'Arrange nodes side by side.',
    type: 'horizontal',
    gap: 56,
    previewCells: [
      { x: 0.04, y: 0.28, w: 0.24, h: 0.44 },
      { x: 0.38, y: 0.28, w: 0.24, h: 0.44 },
      { x: 0.72, y: 0.28, w: 0.24, h: 0.44 },
    ],
  },
  {
    id: 'vertical',
    name: 'Stack',
    description: 'Stack nodes vertically.',
    type: 'vertical',
    gap: 52,
    previewCells: [
      { x: 0.2, y: 0.05, w: 0.6, h: 0.22 },
      { x: 0.2, y: 0.38, w: 0.6, h: 0.22 },
      { x: 0.2, y: 0.71, w: 0.6, h: 0.22 },
    ],
  },
  {
    id: 'compactGrid',
    name: 'Compact',
    description: 'Auto grid based on count.',
    type: 'compactGrid',
    gap: 40,
    previewCells: [
      { x: 0.08, y: 0.12, w: 0.36, h: 0.34 },
      { x: 0.56, y: 0.12, w: 0.36, h: 0.34 },
      { x: 0.08, y: 0.54, w: 0.36, h: 0.34 },
      { x: 0.56, y: 0.54, w: 0.36, h: 0.34 },
    ],
  },
  {
    id: 'stagger',
    name: 'Staggered',
    description: 'Row with offset zigzag.',
    type: 'stagger',
    gap: 52,
    previewCells: [
      { x: 0.06, y: 0.1, w: 0.36, h: 0.3 },
      { x: 0.58, y: 0.28, w: 0.36, h: 0.3 },
      { x: 0.06, y: 0.58, w: 0.36, h: 0.3 },
    ],
  },
  {
    id: 'wideRow',
    name: 'Wide Row',
    description: 'Generous horizontal spacing.',
    type: 'horizontal',
    gap: 80,
    previewCells: [
      { x: 0.03, y: 0.3, w: 0.22, h: 0.4 },
      { x: 0.39, y: 0.3, w: 0.22, h: 0.4 },
      { x: 0.75, y: 0.3, w: 0.22, h: 0.4 },
    ],
  },
  {
    id: 'pyramid',
    name: 'Pyramid',
    description: 'One on top, wider below.',
    type: 'pyramid',
    gap: 48,
    previewCells: [
      { x: 0.32, y: 0.06, w: 0.36, h: 0.24 },
      { x: 0.1, y: 0.4, w: 0.32, h: 0.24 },
      { x: 0.58, y: 0.4, w: 0.32, h: 0.24 },
      { x: 0.1, y: 0.72, w: 0.32, h: 0.22 },
      { x: 0.58, y: 0.72, w: 0.32, h: 0.22 },
    ],
  },
]

const layoutById = new Map(SELECTION_LAYOUTS.map((layout) => [layout.id, layout]))

export function getSelectionLayout(layoutId) {
  return layoutById.get(layoutId) ?? null
}

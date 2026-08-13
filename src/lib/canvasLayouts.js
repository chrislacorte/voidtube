export const DEFAULT_LAYOUT_ID = 'free'

/** Inner padding (px) applied inside each slot region */
export const DEFAULT_SLOT_INSET = 32

export const CANVAS_LAYOUTS = [
  {
    id: 'free',
    name: 'Free',
    description: 'No layout — nodes appear in the canvas center.',
    width: 0,
    height: 0,
    slots: [],
  },
  {
    id: 'studySplit',
    name: 'Study Split',
    description: 'Video left, transcript right, notes below.',
    width: 1520,
    height: 960,
    slotInset: 32,
    slots: [
      {
        id: 'mainVideo',
        label: 'Video',
        types: ['video'],
        region: { x: 0.03, y: 0.04, w: 0.44, h: 0.5 },
        defaultSize: { width: 480, height: 400 },
      },
      {
        id: 'transcript',
        label: 'Transcript',
        types: ['transcript'],
        region: { x: 0.51, y: 0.04, w: 0.46, h: 0.5 },
      },
      {
        id: 'notes',
        label: 'Notes',
        types: ['simpleText', 'essay', 'checkpoint', 'any'],
        region: { x: 0.03, y: 0.58, w: 0.94, h: 0.38 },
      },
    ],
  },
  {
    id: 'twoColumn',
    name: 'Two Columns',
    description: 'Video left, note and essay stacked on the right.',
    width: 1420,
    height: 880,
    slotInset: 32,
    slots: [
      {
        id: 'mainVideo',
        label: 'Video',
        types: ['video'],
        region: { x: 0.03, y: 0.05, w: 0.52, h: 0.9 },
        defaultSize: { width: 520, height: 440 },
      },
      {
        id: 'noteTop',
        label: 'Note',
        types: ['simpleText', 'checkpoint'],
        region: { x: 0.58, y: 0.05, w: 0.39, h: 0.4 },
      },
      {
        id: 'essayBottom',
        label: 'Essay',
        types: ['essay', 'transcript', 'any'],
        region: { x: 0.58, y: 0.5, w: 0.39, h: 0.45 },
      },
    ],
  },
  {
    id: 'videoNotes',
    name: 'Video + Notes',
    description: 'Video centered on top, notes below.',
    width: 1320,
    height: 940,
    slotInset: 32,
    slots: [
      {
        id: 'mainVideo',
        label: 'Video',
        types: ['video'],
        region: { x: 0.12, y: 0.04, w: 0.76, h: 0.46 },
        defaultSize: { width: 560, height: 400 },
      },
      {
        id: 'noteLeft',
        label: 'Note',
        types: ['simpleText', 'checkpoint'],
        region: { x: 0.04, y: 0.56, w: 0.44, h: 0.38 },
      },
      {
        id: 'noteRight',
        label: 'Essay / Transcript',
        types: ['essay', 'transcript', 'any'],
        region: { x: 0.52, y: 0.56, w: 0.44, h: 0.38 },
      },
    ],
  },
  {
    id: 'tripleColumn',
    name: 'Three Columns',
    description: 'Video, transcript, and notes side by side.',
    width: 1580,
    height: 820,
    slotInset: 28,
    slots: [
      {
        id: 'mainVideo',
        label: 'Video',
        types: ['video'],
        region: { x: 0.02, y: 0.06, w: 0.3, h: 0.88 },
        defaultSize: { width: 420, height: 380 },
      },
      {
        id: 'transcript',
        label: 'Transcript',
        types: ['transcript'],
        region: { x: 0.35, y: 0.06, w: 0.3, h: 0.88 },
      },
      {
        id: 'notes',
        label: 'Notes',
        types: ['simpleText', 'essay', 'checkpoint', 'any'],
        region: { x: 0.68, y: 0.06, w: 0.3, h: 0.88 },
      },
    ],
  },
  {
    id: 'focusStack',
    name: 'Focus Stack',
    description: 'Video top, transcript middle, notes bottom — vertically focused.',
    width: 1100,
    height: 1040,
    slotInset: 36,
    slots: [
      {
        id: 'mainVideo',
        label: 'Video',
        types: ['video'],
        region: { x: 0.08, y: 0.03, w: 0.84, h: 0.38 },
        defaultSize: { width: 640, height: 360 },
      },
      {
        id: 'transcript',
        label: 'Transcript',
        types: ['transcript'],
        region: { x: 0.06, y: 0.44, w: 0.88, h: 0.28 },
      },
      {
        id: 'notes',
        label: 'Notes',
        types: ['simpleText', 'essay', 'checkpoint', 'any'],
        region: { x: 0.06, y: 0.75, w: 0.88, h: 0.22 },
      },
    ],
  },
  {
    id: 'presentation',
    name: 'Presentation',
    description: 'Large video center, notes in a row below.',
    width: 1480,
    height: 920,
    slotInset: 32,
    slots: [
      {
        id: 'mainVideo',
        label: 'Video',
        types: ['video'],
        region: { x: 0.18, y: 0.04, w: 0.64, h: 0.52 },
        defaultSize: { width: 720, height: 420 },
      },
      {
        id: 'noteLeft',
        label: 'Note',
        types: ['simpleText', 'checkpoint'],
        region: { x: 0.04, y: 0.62, w: 0.28, h: 0.32 },
      },
      {
        id: 'essayCenter',
        label: 'Essay',
        types: ['essay'],
        region: { x: 0.36, y: 0.62, w: 0.28, h: 0.32 },
      },
      {
        id: 'transcriptRight',
        label: 'Transcript',
        types: ['transcript', 'any'],
        region: { x: 0.68, y: 0.62, w: 0.28, h: 0.32 },
      },
    ],
  },
  {
    id: 'sideBySide',
    name: 'Side by Side',
    description: 'Video and transcript equal size, essay below.',
    width: 1360,
    height: 900,
    slotInset: 32,
    slots: [
      {
        id: 'mainVideo',
        label: 'Video',
        types: ['video'],
        region: { x: 0.03, y: 0.05, w: 0.45, h: 0.48 },
        defaultSize: { width: 500, height: 400 },
      },
      {
        id: 'transcript',
        label: 'Transcript',
        types: ['transcript'],
        region: { x: 0.52, y: 0.05, w: 0.45, h: 0.48 },
      },
      {
        id: 'essayBottom',
        label: 'Essay / Notes',
        types: ['essay', 'simpleText', 'checkpoint', 'any'],
        region: { x: 0.03, y: 0.58, w: 0.94, h: 0.36 },
      },
    ],
  },
]

const layoutById = new Map(CANVAS_LAYOUTS.map((layout) => [layout.id, layout]))

export function getCanvasLayout(layoutId) {
  return layoutById.get(layoutId) ?? layoutById.get(DEFAULT_LAYOUT_ID)
}

export function isLayoutActive(layoutId) {
  return Boolean(layoutId && layoutId !== DEFAULT_LAYOUT_ID)
}

export function slotAcceptsType(slot, nodeType) {
  if (!slot?.types?.length) return false
  return slot.types.includes('any') || slot.types.includes(nodeType)
}

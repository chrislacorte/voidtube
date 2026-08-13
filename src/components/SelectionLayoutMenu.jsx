import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import { useReactFlow, useViewport } from '@xyflow/react'
import { computeSelectionBounds } from '../lib/layoutEngine'
import { SELECTION_LAYOUTS } from '../lib/selectionLayouts'
import { useVoidTubeStore } from '../stores/useVoidTubeStore'
import { cn } from '../lib/utils'

function SelectionLayoutPreview({ cells }) {
  return (
    <div className="relative h-10 overflow-hidden rounded-md border border-border bg-muted/30">
      {cells.map((cell, index) => (
        <div
          key={index}
          className="absolute rounded-sm bg-primary/25 ring-1 ring-primary/30"
          style={{
            left: `${cell.x * 100}%`,
            top: `${cell.y * 100}%`,
            width: `${cell.w * 100}%`,
            height: `${cell.h * 100}%`,
          }}
        />
      ))}
    </div>
  )
}

export default function SelectionLayoutMenu() {
  const {
    activeCanvas,
    selectedNodeIds,
    selectionLayoutMenuOpen,
    applySelectionLayout,
  } = useVoidTubeStore()
  const { flowToScreenPosition } = useReactFlow()
  const viewport = useViewport()

  const visible = selectedNodeIds.length >= 2 && selectionLayoutMenuOpen

  const menuPosition = useMemo(() => {
    if (!visible) return null

    const bounds = computeSelectionBounds(activeCanvas.nodes, selectedNodeIds)
    if (!bounds) return null

    const anchor = flowToScreenPosition({ x: bounds.centerX, y: bounds.minY })
    return { x: anchor.x, y: anchor.y - 16 }
  }, [activeCanvas.nodes, selectedNodeIds, flowToScreenPosition, viewport, visible])

  const handleSelect = (layoutId) => {
    applySelectionLayout(layoutId, selectedNodeIds)
  }

  return (
    <AnimatePresence>
      {visible && menuPosition && (
        <motion.div
          key="selection-layout-menu"
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="pointer-events-none fixed z-30"
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div
            className={cn(
              'pointer-events-auto w-[19rem] max-h-[min(24rem,70vh)] overflow-y-auto rounded-2xl border border-border',
              'bg-popover/95 p-2 shadow-lg backdrop-blur-md',
            )}
          >
            <p className="px-2 py-1 text-[11px] font-medium text-foreground">
              Layout for {selectedNodeIds.length} nodes
            </p>
            <p className="px-2 pb-2 text-[10px] text-muted-foreground">
              Arrange selection — positions animate smoothly.
            </p>

            <ul className="grid grid-cols-2 gap-1 p-1">
              {SELECTION_LAYOUTS.map((layout) => (
                <li key={layout.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(layout.id)}
                    className={cn(
                      'w-full rounded-xl p-2 text-left transition-colors hover:bg-accent',
                    )}
                  >
                    <SelectionLayoutPreview cells={layout.previewCells} />
                    <p className="mt-1.5 text-xs font-medium text-foreground">{layout.name}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

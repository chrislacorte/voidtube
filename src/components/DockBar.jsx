import {
  AlignLeft,
  FileText,
  LayoutGrid,
  StickyNote,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { cn } from '../lib/utils'
import { useVoidTubeStore } from '../stores/useVoidTubeStore'
import { useCanvasCenter } from './VoidFlowCanvas'

const DOCK_ITEMS = [
  { type: 'simpleText', label: 'Note', icon: StickyNote },
  { type: 'essay', label: 'Essay', icon: AlignLeft },
  { type: 'transcript', label: 'Transcript', icon: FileText },
]

export default function DockBar() {
  const {
    addNodeWithLayout,
    selectedNodeIds,
    selectionLayoutMenuOpen,
    toggleSelectionLayoutMenu,
    setSelectionLayoutMenuOpen,
  } = useVoidTubeStore()
  const getCenter = useCanvasCenter()
  const [hovered, setHovered] = useState(false)

  const hasSelection = selectedNodeIds.length >= 2
  const showLayoutAction = hasSelection && hovered

  const handleAdd = useCallback(
    (item) => {
      addNodeWithLayout(item.type, getCenter())
    },
    [addNodeWithLayout, getCenter],
  )

  const handleLayoutClick = useCallback(() => {
    if (!selectionLayoutMenuOpen) {
      setSelectionLayoutMenuOpen(true)
      return
    }
    toggleSelectionLayoutMenu()
  }, [selectionLayoutMenuOpen, setSelectionLayoutMenuOpen, toggleSelectionLayoutMenu])

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'pointer-events-auto flex items-center gap-1 rounded-full border border-border',
          'bg-background/90 px-2 py-2 shadow-lg backdrop-blur-md transition-all duration-200',
          showLayoutAction && 'pr-1.5',
        )}
      >
        {showLayoutAction && (
          <button
            type="button"
            title="Selection layout"
            onClick={handleLayoutClick}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              'text-primary transition-colors hover:bg-accent',
              selectionLayoutMenuOpen && 'bg-accent',
            )}
          >
            <LayoutGrid size={18} strokeWidth={1.75} />
          </button>
        )}

        {DOCK_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.type}
              type="button"
              title={item.label}
              onClick={() => handleAdd(item)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                'text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon size={18} strokeWidth={1.75} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

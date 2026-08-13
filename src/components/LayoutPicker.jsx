import { LayoutGrid, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CANVAS_LAYOUTS, getCanvasLayout } from '../lib/canvasLayouts'
import { useVoidTubeStore } from '../stores/useVoidTubeStore'
import { useCanvasCenter } from './VoidFlowCanvas'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

function LayoutPreview({ layout }) {
  if (!layout.slots?.length) {
    return (
      <div className="flex h-12 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-[10px] text-muted-foreground">
        Free canvas
      </div>
    )
  }

  return (
    <div className="relative h-12 overflow-hidden rounded-lg border border-border bg-muted/30">
      {layout.slots.map((slot) => (
        <div
          key={slot.id}
          className="absolute rounded-sm bg-primary/25 ring-1 ring-primary/30"
          style={{
            left: `${slot.region.x * 100}%`,
            top: `${slot.region.y * 100}%`,
            width: `${slot.region.w * 100}%`,
            height: `${slot.region.h * 100}%`,
          }}
          title={slot.label}
        />
      ))}
    </div>
  )
}

export default function LayoutPicker() {
  const { activeCanvas, setCanvasLayout, applyCanvasLayout } = useVoidTubeStore()
  const getCenter = useCanvasCenter()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const currentLayoutId = activeCanvas.layoutId ?? 'free'
  const currentLayout = getCanvasLayout(currentLayoutId)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (layoutId) => {
    setCanvasLayout(layoutId, getCenter(), true)
    setOpen(false)
  }

  const handleApply = () => {
    applyCanvasLayout(getCenter())
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5"
      >
        <LayoutGrid size={14} />
        Layout
      </Button>

      {open && (
        <div className="top-bar-glass-card absolute right-0 top-[calc(100%+0.35rem)] z-50 w-72 overflow-hidden rounded-2xl p-2 shadow-lg">
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Invisible layout — nodes align automatically.
          </p>

          <ul className="max-h-[28rem] space-y-1 overflow-y-auto p-1">
            {CANVAS_LAYOUTS.map((layout) => (
              <li key={layout.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(layout.id)}
                  className={cn(
                    'w-full rounded-xl p-2 text-left transition-colors hover:bg-accent',
                    layout.id === currentLayoutId && 'bg-accent ring-1 ring-primary/30',
                  )}
                >
                  <div className="mb-2">
                    <LayoutPreview layout={layout} />
                  </div>
                  <p className="text-sm font-medium text-foreground">{layout.name}</p>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {layout.description}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {currentLayoutId !== 'free' && (
            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={handleApply}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <RotateCcw size={14} />
                Apply layout
              </button>
            </div>
          )}

          <p className="border-t border-border px-2 py-2 text-[10px] text-muted-foreground">
            Active: <span className="font-medium text-foreground">{currentLayout.name}</span>
          </p>
        </div>
      )}
    </div>
  )
}

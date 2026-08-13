import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useVoidTubeStore } from '../stores/useVoidTubeStore'

export default function CanvasSwitcher() {
  const { state, activeCanvas, createCanvas, switchCanvas, renameCanvas, deleteCanvas } =
    useVoidTubeStore()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draftName, setDraftName] = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
        setEditingId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const startRename = (canvas) => {
    setEditingId(canvas.id)
    setDraftName(canvas.name)
  }

  const commitRename = (canvasId) => {
    const name = draftName.trim()
    if (name) renameCanvas(canvasId, name)
    setEditingId(null)
  }

  const handleDelete = (canvasId) => {
    if (state.canvases.length <= 1) return
    if (window.confirm('Delete this playlist?')) {
      deleteCanvas(canvasId)
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10"
      >
        <span className="max-w-[140px] truncate">{activeCanvas.name}</span>
        <ChevronDown size={14} className="text-white/40" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-white/10 bg-[#1a1a1a] py-1 shadow-xl shadow-black/50">
          {state.canvases.map((canvas) => (
            <div
              key={canvas.id}
              className={`flex items-center gap-1 px-2 py-1 ${
                canvas.id === activeCanvas.id ? 'bg-violet-500/10' : ''
              }`}
            >
              {editingId === canvas.id ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={() => commitRename(canvas.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(canvas.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="min-w-0 flex-1 rounded bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-violet-500/50"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    switchCanvas(canvas.id)
                    setOpen(false)
                  }}
                  className="min-w-0 flex-1 truncate rounded px-2 py-1 text-left text-sm text-white/80 hover:bg-white/5"
                >
                  {canvas.name}
                </button>
              )}
              <button
                type="button"
                onClick={() => startRename(canvas)}
                className="rounded p-1 text-white/30 hover:bg-white/5 hover:text-white/70"
                aria-label="Rename canvas"
              >
                <Pencil size={13} />
              </button>
              {state.canvases.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDelete(canvas.id)}
                  className="rounded p-1 text-white/30 hover:bg-white/5 hover:text-red-400"
                  aria-label="Delete canvas"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          <div className="mt-1 border-t border-white/5 px-2 pt-1">
            <button
              type="button"
              onClick={() => {
                createCanvas()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-violet-400 hover:bg-white/5"
            >
              <Plus size={14} />
              New playlist / canvas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

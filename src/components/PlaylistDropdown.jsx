import { Check, ChevronDown, Pencil, Plus, Trash2, Video } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getCanvasLayout } from '../lib/canvasLayouts'
import { cn } from '../lib/utils'
import { useVoidTubeStore } from '../stores/useVoidTubeStore'
import { Button } from './ui/button'

function getPlaylistStats(canvas) {
  const nodes = canvas.nodes ?? []
  return {
    total: nodes.length,
    videos: nodes.filter((n) => n.type === 'video').length,
    notes: nodes.filter((n) => ['simpleText', 'essay', 'checkpoint'].includes(n.type)).length,
  }
}

export default function PlaylistDropdown() {
  const {
    state,
    activeCanvas,
    switchCanvas,
    createCanvas,
    renameCanvas,
    deleteCanvas,
  } = useVoidTubeStore()

  const canvases = state.canvases ?? []
  const activeCanvasId = state.activeCanvasId

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const rootRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
        setEditingId(null)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const startRename = (canvas, e) => {
    e?.stopPropagation()
    setEditingId(canvas.id)
    setDraftName(canvas.name)
    setCreating(false)
  }

  const commitRename = (canvasId) => {
    const name = draftName.trim()
    if (name) renameCanvas(canvasId, name)
    setEditingId(null)
  }

  const handleDelete = (canvasId, e) => {
    e?.stopPropagation()
    if (canvases.length <= 1) return
    if (window.confirm('Delete this playlist? All nodes will be lost.')) {
      deleteCanvas(canvasId)
    }
  }

  const handleCreate = () => {
    const name = newName.trim() || `Playlist ${canvases.length + 1}`
    createCanvas(name)
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  const handleSelect = (canvasId) => {
    if (editingId) return
    switchCanvas(canvasId)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="max-w-[11rem] gap-1.5"
        title={activeCanvas.name}
      >
        <span className="truncate">{activeCanvas.name}</span>
        <ChevronDown
          size={14}
          className={cn('shrink-0 transition-transform', open && 'rotate-180')}
        />
      </Button>

      {open && (
        <div className="top-bar-glass-card absolute right-0 top-[calc(100%+0.35rem)] z-50 w-80 overflow-hidden rounded-2xl shadow-lg">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-xs font-medium text-foreground">Playlists</p>
            <p className="text-[11px] text-muted-foreground">
              {canvases.length} {canvases.length === 1 ? 'playlist' : 'playlists'} · Switch or
              rename
            </p>
          </div>

          <ul className="max-h-72 overflow-y-auto p-1">
            {canvases.map((canvas) => {
              const stats = getPlaylistStats(canvas)
              const isActive = canvas.id === activeCanvasId
              const layout = getCanvasLayout(canvas.layoutId ?? 'free')

              return (
                <li key={canvas.id}>
                  <div
                    className={cn(
                      'group rounded-xl transition-colors',
                      isActive ? 'bg-accent' : 'hover:bg-accent/60',
                    )}
                  >
                    {editingId === canvas.id ? (
                      <div className="flex items-center gap-1 px-2 py-2">
                        <input
                          autoFocus
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onBlur={() => commitRename(canvas.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(canvas.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none ring-1 ring-ring"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelect(canvas.id)}
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                            isActive
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background',
                          )}
                        >
                          {isActive && <Check size={10} strokeWidth={3} />}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'truncate text-sm',
                                isActive ? 'font-semibold text-foreground' : 'text-foreground',
                              )}
                            >
                              {canvas.name}
                            </span>
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                            <span className="inline-flex items-center gap-0.5">
                              <Video size={10} />
                              {stats.videos} Video{stats.videos !== 1 ? 's' : ''}
                            </span>
                            <span>·</span>
                            <span>{stats.notes} notes</span>
                            <span>·</span>
                            <span>{stats.total} Nodes</span>
                            {layout.id !== 'free' && (
                              <>
                                <span>·</span>
                                <span>{layout.name}</span>
                              </>
                            )}
                          </span>
                        </span>
                      </button>
                    )}

                    {editingId !== canvas.id && (
                      <div className="flex items-center justify-end gap-0.5 px-2 pb-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => startRename(canvas, e)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                          aria-label="Rename playlist"
                        >
                          <Pencil size={12} />
                        </button>
                        {canvases.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(canvas.id, e)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-destructive"
                            aria-label="Delete playlist"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-border p-2">
            {creating ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={`Playlist ${canvases.length + 1}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') setCreating(false)
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none ring-1 ring-ring"
                />
                <Button size="sm" onClick={handleCreate}>
                  Create
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCreating(true)
                  setNewName('')
                  setEditingId(null)
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus size={14} />
                New playlist
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

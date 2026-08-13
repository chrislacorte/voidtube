import { Handle, Position } from '@xyflow/react'
import { Bookmark, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { useVoidTubeStore } from '../../stores/useVoidTubeStore'

export default function NodeShell({
  id,
  title,
  subtitle,
  onTitleChange,
  onDelete,
  onToggleFavorite,
  isFavorite = false,
  children,
  width = 320,
  className = '',
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef(null)

  useEffect(() => {
    setDraft(title)
  }, [title])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commitTitle = () => {
    const next = draft.trim() || title
    onTitleChange?.(next)
    setDraft(next)
    setEditing(false)
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card text-card-foreground shadow-lg',
        isFavorite && 'ring-1 ring-amber-400/45',
        className,
      )}
      style={{ width }}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-border !bg-primary" />
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-border !bg-primary" />

      <div className="group border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle()
                if (e.key === 'Escape') {
                  setDraft(title)
                  setEditing(false)
                }
              }}
              className="min-w-0 flex-1 rounded-md bg-muted px-2 py-0.5 text-sm text-foreground outline-none ring-1 ring-ring"
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => setEditing(true)}
              className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground"
              title="Double-click to rename"
            >
              {title}
            </button>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={cn(
                'rounded p-1 transition hover:bg-accent',
                isFavorite
                  ? 'text-amber-500'
                  : 'text-muted-foreground opacity-0 group-hover:opacity-100',
              )}
              aria-label={isFavorite ? 'Remove favorite' : 'Mark as favorite'}
              aria-pressed={isFavorite}
            >
              <Bookmark size={14} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete?.(id)}
            className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-destructive group-hover:opacity-100"
            aria-label="Delete node"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {subtitle && (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="p-3">{children}</div>
    </div>
  )
}

export function useNodeActions(id) {
  const { updateNodeData, removeNode } = useVoidTubeStore()

  return {
    updateData: (updates) => updateNodeData(id, updates),
    deleteNode: () => removeNode(id),
    setTitle: (title) => updateNodeData(id, { title }),
  }
}

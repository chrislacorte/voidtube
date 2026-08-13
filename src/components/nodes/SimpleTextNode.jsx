import { memo } from 'react'
import NodeShell, { useNodeActions } from './NodeShell'

function SimpleTextNode({ id, data }) {
  const { updateData, deleteNode, setTitle } = useNodeActions(id)

  return (
    <NodeShell
      id={id}
      title={data.title || 'Quick Note'}
      onTitleChange={setTitle}
      onDelete={deleteNode}
      isFavorite={Boolean(data.favorite)}
      onToggleFavorite={() => updateData({ favorite: !data.favorite })}
      width={260}
    >
      <textarea
        value={data.content || ''}
        onChange={(e) => updateData({ content: e.target.value })}
        rows={4}
        placeholder="Short notes, numbers, keywords…"
        className="nodrag nowheel w-full resize-none rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/35 focus:ring-1 focus:ring-primary/15"
      />
    </NodeShell>
  )
}

export default memo(SimpleTextNode)

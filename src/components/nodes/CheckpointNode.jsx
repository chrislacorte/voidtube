import { Clock } from 'lucide-react'
import { memo, useEffect, useState } from 'react'
import { isTimestampActive } from '../../lib/timestamp'
import { formatTimestamp } from '../../lib/youtube'
import { useVoidTubeStore } from '../../stores/useVoidTubeStore'
import NodeShell, { useNodeActions } from './NodeShell'

function CheckpointNode({ id, data }) {
  const { seekFromCheckpoint, getVideoCurrentTime, getVideoTitle } = useVoidTubeStore()
  const { updateData, deleteNode, setTitle } = useNodeActions(id)
  const [active, setActive] = useState(false)

  const videoNodeId = data.videoNodeId
  const seconds = data.seconds ?? 0
  const videoTitle = (videoNodeId && getVideoTitle(videoNodeId)) || data.videoTitle || null

  useEffect(() => {
    if (!videoNodeId) return undefined

    const tick = () => {
      const time = getVideoCurrentTime(videoNodeId)
      setActive(isTimestampActive(seconds, time))
    }

    tick()
    const interval = setInterval(tick, 300)
    return () => clearInterval(interval)
  }, [videoNodeId, seconds, getVideoCurrentTime])

  const handleJump = () => {
    seekFromCheckpoint(id)
  }

  return (
    <NodeShell
      id={id}
      title={data.title || formatTimestamp(seconds)}
      onTitleChange={setTitle}
      onDelete={deleteNode}
      isFavorite={Boolean(data.favorite)}
      onToggleFavorite={() => updateData({ favorite: !data.favorite })}
      width={260}
      className={active ? 'checkpoint-active' : ''}
      subtitle={videoTitle}
    >
      <button
        type="button"
        onClick={handleJump}
        className="nodrag nopan mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300 transition hover:bg-violet-500/25"
      >
        <Clock size={12} />
        {formatTimestamp(seconds)}
      </button>
      <textarea
        value={data.content || ''}
        onChange={(e) => updateData({ content: e.target.value })}
        rows={4}
        placeholder="Note for this moment…"
        className="nodrag nowheel w-full resize-none rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/35 focus:ring-1 focus:ring-primary/15"
      />
    </NodeShell>
  )
}

export default memo(CheckpointNode)

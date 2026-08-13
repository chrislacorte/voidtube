import { Loader2, Search } from 'lucide-react'
import { memo, useEffect, useMemo, useState } from 'react'
import { fetchTranscript } from '../../lib/api'
import { useBilling } from '../../stores/BillingProvider'
import { formatTimestamp } from '../../lib/youtube'
import { useVoidTubeStore } from '../../stores/useVoidTubeStore'
import NodeShell, { useNodeActions } from './NodeShell'

function highlightText(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/20 px-0.5 text-foreground">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function TranscriptNode({ id, data }) {
  const { getConnectedVideoData, seekFromTranscript } = useVoidTubeStore()
  const { handleLimitExceeded, refreshBilling } = useBilling()
  const { updateData, deleteNode, setTitle } = useNodeActions(id)
  const [query, setQuery] = useState('')

  const connected = getConnectedVideoData(id)
  const videoId = data.videoId || connected?.videoId
  const segments = data.segments || []
  const status = data.status || 'idle'

  useEffect(() => {
    if (connected?.videoId && !data.videoId) {
      updateData({ videoId: connected.videoId })
    }
  }, [connected?.videoId, data.videoId, updateData])

  useEffect(() => {
    if (data.error?.includes('TRANSCRIPT_PROXY') || data.error?.includes('blocks cloud IPs')) {
      updateData({ status: 'idle', error: null })
    }
  }, [data.error, updateData])

  const filtered = useMemo(() => {
    if (!query.trim()) return segments
    const q = query.trim().toLowerCase()
    return segments.filter((s) => s.text.toLowerCase().includes(q))
  }, [segments, query])

  const handleTranscribe = async () => {
    if (!videoId) {
      updateData({ status: 'error', error: 'Connect a video node or enter a video ID' })
      return
    }

    updateData({ status: 'loading', error: null })

    try {
      const result = await fetchTranscript(videoId)
      updateData({ segments: result, status: 'ready', videoId, error: null })
      refreshBilling()
    } catch (err) {
      if (handleLimitExceeded(err)) {
        updateData({
          status: 'error',
          error: 'Monthly transcript limit reached',
        })
        return
      }
      updateData({
        status: 'error',
        error: err.message || 'No captions for this video',
      })
    }
  }

  return (
    <NodeShell
      id={id}
      title={data.title || 'Transcript'}
      subtitle={connected?.title || (videoId ? `Video: ${videoId}` : undefined)}
      onTitleChange={setTitle}
      onDelete={deleteNode}
      width={340}
    >
      <div className="nodrag nowheel mb-2 flex gap-2">
        <input
          type="text"
          value={data.videoId || connected?.videoId || ''}
          onChange={(e) => updateData({ videoId: e.target.value.trim() })}
          placeholder={connected ? `Linked: ${connected.videoId}` : 'Video ID (optional)'}
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={handleTranscribe}
          disabled={status === 'loading' || !videoId}
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : 'Transcribe'}
        </button>
      </div>

      {segments.length > 0 && (
        <div className="nodrag nowheel relative mb-2">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript…"
            className="w-full rounded-lg border border-input bg-background py-1.5 pl-8 pr-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {status === 'error' && (
        <p className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{data.error}</p>
      )}

      {!connected && !data.videoId && status !== 'error' && (
        <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
          Connect a video node with an edge — or enter the 11-character YouTube ID.
          Then click &quot;Transcribe&quot;.
        </p>
      )}

      <div className="nodrag nowheel max-h-52 space-y-0.5 overflow-y-auto">
        {filtered.length === 0 && status === 'ready' && query && (
          <p className="text-xs text-muted-foreground">No matches for &quot;{query}&quot;</p>
        )}
        {filtered.map((segment, i) => (
          <button
            key={`${segment.offset}-${i}`}
            type="button"
            onClick={() => seekFromTranscript(id, segment.offset)}
            className="flex w-full gap-2 rounded-md px-1 py-1 text-left text-xs transition hover:bg-accent"
          >
            <span className="shrink-0 font-mono text-primary">
              {formatTimestamp(segment.offset)}
            </span>
            <span className="text-foreground/80">{highlightText(segment.text, query)}</span>
          </button>
        ))}
      </div>
    </NodeShell>
  )
}

export default memo(TranscriptNode)

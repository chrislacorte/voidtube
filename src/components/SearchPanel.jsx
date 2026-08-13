import { Loader2, Search, X } from 'lucide-react'
import { useState } from 'react'
import { searchYouTube } from '../lib/api'
import { useCanvasCenter } from './VoidFlowCanvas'

export default function SearchPanel({ open, onClose, onAddVideo }) {
  const getCenter = useCanvasCenter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return

    setLoading(true)
    setError(null)

    try {
      const items = await searchYouTube(q)
      setResults(items)
    } catch (err) {
      setError(err.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (video) => {
    const position = getCenter()
    onAddVideo(video, position)
    onClose()
  }

  if (!open) return null

  return (
    <aside className="absolute right-0 top-14 z-40 flex h-[calc(100%-3.5rem)] w-80 flex-col border-l border-white/10 bg-[#141414]/95 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <h2 className="text-sm font-medium text-white/80">YouTube Search</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-white/70"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSearch} className="border-b border-white/5 p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos…"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-violet-500/50"
          />
        </div>
      </form>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/40">
            <Loader2 size={16} className="animate-spin" />
            Searching…
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
        )}

        {!loading && !error && !query && (
          <p className="px-3 py-6 text-center text-xs leading-relaxed text-white/35">
            Search topics, tutorials, or channels — results become video nodes
            auf dem Canvas.
          </p>
        )}

        {!loading && !error && results.length === 0 && query && (
          <p className="px-2 py-4 text-center text-xs text-white/35">No results</p>
        )}

        <ul className="space-y-1">
          {results.map((video) => (
            <li key={video.videoId}>
              <button
                type="button"
                onClick={() => handleSelect(video)}
                className="flex w-full gap-3 rounded-lg p-2 text-left transition hover:bg-white/5"
              >
                {video.thumbnailUrl && (
                  <img
                    src={video.thumbnailUrl}
                    alt=""
                    className="h-14 w-24 shrink-0 rounded object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="line-clamp-2 text-xs font-medium text-white/85">{video.title}</p>
                  <p className="mt-0.5 truncate text-[10px] text-white/35">{video.channelTitle}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

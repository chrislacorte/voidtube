import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Search, Sparkles } from 'lucide-react'
import { searchYouTube } from '../lib/api'
import { useBilling } from '../stores/BillingProvider'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { useCanvasCenter } from './VoidFlowCanvas'

const DEBOUNCE_MS = 320
const MIN_QUERY = 1
const MODE_STORAGE_KEY = 'voidtube-search-mode'

function loadSearchMode() {
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY)
    return stored === 'prompt' ? 'prompt' : 'search'
  } catch {
    return 'search'
  }
}

export default function SearchAutocomplete({ onAddVideo, onGeneratePlaylist }) {
  const getCenter = useCanvasCenter()
  const { handleLimitExceeded, refreshBilling } = useBilling()
  const [mode, setMode] = useState(loadSearchMode)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode)
    } catch {
      // ignore storage errors
    }
  }, [mode])

  const runSearch = useCallback(async (q) => {
    if (q.length < MIN_QUERY) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const items = await searchYouTube(q, 8)
      setResults(items)
      setActiveIndex(-1)
      refreshBilling()
    } catch (err) {
      if (handleLimitExceeded(err)) {
        setError('Monthly search limit reached')
      } else {
        setError(err.message)
      }
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [refreshBilling, handleLimitExceeded])

  useEffect(() => {
    if (!open || mode !== 'search') return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      runSearch(query.trim())
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open, runSearch, mode])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (video) => {
    const position = getCenter()
    onAddVideo(video, position)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const handleGeneratePlaylist = async () => {
    const prompt = query.trim()
    if (!prompt || !onGeneratePlaylist) return

    setLoading(true)
    setError(null)
    setSuccess(null)
    setOpen(true)

    try {
      const center = getCenter()
      const result = await onGeneratePlaylist({ prompt, center })
      setQuery('')
      setSuccess(`${result.count} videos added to "${result.title}"`)
      setOpen(true)
      refreshBilling()
    } catch (err) {
      if (handleLimitExceeded(err)) {
        setError('Monthly playlist limit reached')
      } else {
        setError(err.message || 'Could not create playlist')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (mode === 'prompt') {
      if (e.key === 'Enter' && !loading) {
        e.preventDefault()
        handleGeneratePlaylist()
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
      return
    }

    if (!open || results.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setResults([])
    setError(null)
    setSuccess(null)
    setActiveIndex(-1)
    setOpen(false)
  }

  const showDropdown =
    open &&
    (mode === 'prompt'
      ? loading || error || success || query.trim().length > 0
      : loading || error || results.length > 0 || query.trim().length >= MIN_QUERY)

  return (
    <div ref={rootRef} className="search-glass-shell w-full max-w-xl">
      <div className="search-glass-aura" aria-hidden />
      <div className="search-glass-panel relative flex items-center gap-2 pr-2">
        <div className="search-mode-toggle shrink-0" role="tablist" aria-label="Suchmodus">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'search'}
            className={cn('search-mode-tab', mode === 'search' && 'is-active')}
            onClick={() => switchMode('search')}
          >
            Search
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'prompt'}
            className={cn('search-mode-tab', mode === 'prompt' && 'is-active')}
            onClick={() => switchMode('prompt')}
          >
            Prompt
          </button>
        </div>

        <Search
          size={16}
          className="pointer-events-none shrink-0 text-muted-foreground"
        />

        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setSuccess(null)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'prompt'
              ? 'Create a playlist with the best PHP tutorials…'
              : 'Search a video'
          }
          className="search-glass-input h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          autoComplete="off"
        />

        {mode === 'prompt' && (
          <Button
            type="button"
            size="sm"
            className="search-playlist-btn shrink-0"
            disabled={loading || !query.trim()}
            onClick={handleGeneratePlaylist}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Sparkles size={14} />
                <span className="hidden sm:inline">Playlist</span>
              </>
            )}
          </Button>
        )}

        {loading && mode === 'search' && (
          <Loader2 size={16} className="shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="search-glass-dropdown absolute left-0 right-0 top-[calc(100%+0.65rem)] z-50 overflow-hidden rounded-2xl">
          {error && <p className="px-4 py-3 text-sm text-destructive">{error}</p>}

          {success && (
            <p className="px-4 py-3 text-sm font-medium text-primary">{success}</p>
          )}

          {mode === 'search' && !loading && !error && results.length === 0 && query.trim().length >= MIN_QUERY && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results
            </p>
          )}

          {mode === 'search' && !error && results.length > 0 && (
            <ul className="max-h-80 overflow-y-auto p-1">
              {results.map((video, index) => (
                <li key={video.videoId}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelect(video)}
                    className={cn(
                      'flex w-full gap-3 rounded-xl p-2.5 text-left transition-colors',
                      activeIndex === index ? 'bg-accent' : 'hover:bg-accent/60',
                    )}
                  >
                    {video.thumbnailUrl && (
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="h-12 w-[4.5rem] shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">
                        {video.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {video.channelTitle}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {mode === 'prompt' && !loading && !error && !success && query.trim() && (
            <div className="px-4 py-4 text-sm text-muted-foreground">
              <p>Describe your learning goal in natural language.</p>
              <p className="mt-1 text-xs opacity-80">
                Press Enter or &quot;Playlist&quot; — a new canvas with videos in a grid will be created.
              </p>
            </div>
          )}

          {loading && mode === 'search' && results.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Searching…
            </div>
          )}

          {loading && mode === 'prompt' && (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Creating playlist…
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { AnimatePresence, motion } from 'motion/react'
import { Bookmark, Loader2, Play, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useYouTubePlayer } from '../hooks/useYouTubePlayer'
import { fetchTranscript, fetchVideoChapters } from '../lib/api'
import { useBilling } from '../stores/BillingProvider'
import {
  ensureSegmentsWords,
  getActiveSegmentIndex,
  getActiveWordIndex,
} from '../lib/transcriptWords'
import { isTimestampActive } from '../lib/timestamp'
import { formatTimestamp } from '../lib/youtube'
import { cn } from '../lib/utils'
import { DEFAULT_FOCUS_LAYOUT } from '../lib/focusLayout'
import { useVoidTubeStore } from '../stores/useVoidTubeStore'
import { Button } from './ui/button'
import FocusSplitLayout from './FocusSplitLayout'
import YouTubePlayerContainer from './YouTubePlayerContainer'
import VideoTimeline from './nodes/VideoTimeline'

const FOCUS_SPRING = { type: 'spring', stiffness: 320, damping: 32, mass: 0.85 }

const FOCUS_TABS = [
  { id: 'text', label: 'Text', nodeType: 'simpleText' },
  { id: 'checkpoint', label: 'Checkpoint', nodeType: 'checkpoint' },
  { id: 'transcript', label: 'Transcript' },
]

function FocusModeTabBar({ activeTab, onChange, onClose }) {
  return (
    <div className="focus-mode-tab-row">
      <p className="focus-mode-title">Focus Mode</p>

      <div className="focus-mode-tab-bar" role="tablist" aria-label="Focus Mode sections">
        {FOCUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={cn('focus-mode-tab', activeTab === tab.id && 'is-active')}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="focus-mode-close-btn"
        aria-label="Exit Focus Mode"
      >
        <X size={18} strokeWidth={2.5} />
      </button>
    </div>
  )
}

function highlightText(text, query) {
  if (!query?.trim()) return text

  const q = query.trim().toLowerCase()
  const lower = text.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx === -1) return text

  return (
    <>
      {text.slice(0, idx)}
      <mark className="focus-transcript-search-mark">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

function FocusTranscriptPanel({
  panelRef,
  segments,
  status,
  error,
  currentTime,
  onSeek,
  onLoad,
  chapters,
  chaptersStatus,
  onLoadChapters,
}) {
  const [query, setQuery] = useState('')
  const [showChapters, setShowChapters] = useState(false)
  const activeParagraphRef = useRef(null)
  const lastScrolledIndexRef = useRef(-1)

  const segmentsWithWords = useMemo(() => ensureSegmentsWords(segments), [segments])

  const activeSegmentIndex = useMemo(
    () => getActiveSegmentIndex(segmentsWithWords, currentTime),
    [segmentsWithWords, currentTime],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return segmentsWithWords
    const q = query.trim().toLowerCase()
    return segmentsWithWords.filter((segment) => segment.text.toLowerCase().includes(q))
  }, [segmentsWithWords, query])

  useEffect(() => {
    if (activeSegmentIndex < 0 || activeSegmentIndex === lastScrolledIndexRef.current) return
    lastScrolledIndexRef.current = activeSegmentIndex

    const frame = requestAnimationFrame(() => {
      activeParagraphRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [activeSegmentIndex, filtered])

  return (
    <div ref={panelRef} className="focus-transcript-panel focus-transcript-panel--embedded">
      <div className="focus-transcript-toolbar">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search transcript"
          className="focus-transcript-search"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (chapters.length >= 2) {
              setShowChapters((value) => !value)
              return
            }
            onLoadChapters()
          }}
          disabled={chaptersStatus === 'loading'}
          className="shrink-0"
        >
          {chaptersStatus === 'loading' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            'Get chapters'
          )}
        </Button>
      </div>

      {showChapters && chapters.length >= 2 && (
        <div className="focus-chapters-list">
          {chapters.map((chapter) => (
            <button
              key={`${chapter.seconds}-${chapter.title}`}
              type="button"
              className="focus-chapter-btn"
              onClick={() => onSeek(chapter.seconds)}
            >
              <span className="font-semibold">{formatTimestamp(chapter.seconds)}</span>
              <span>{chapter.title}</span>
            </button>
          ))}
        </div>
      )}

      {status === 'loading' && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Transcript loading…
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3 py-6 text-center">
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error || 'Could not load transcript.'}
          </p>
          <Button variant="outline" size="sm" onClick={onLoad}>
            Try again
          </Button>
        </div>
      )}

      {status === 'idle' && segments.length === 0 && (
        <div className="space-y-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Transcript not loaded yet.
          </p>
          <Button variant="outline" size="sm" onClick={onLoad}>
            Load transcript
          </Button>
        </div>
      )}

      {status === 'ready' && segments.length > 0 && (
        <div className="focus-transcript-body min-h-0 flex-1 overflow-y-auto">
          {filtered.map((segment) => {
            const originalIndex = segmentsWithWords.indexOf(segment)
            const isActiveParagraph = originalIndex === activeSegmentIndex
            const activeWordIndex = isActiveParagraph
              ? getActiveWordIndex(segment.words, currentTime)
              : -1

            return (
              <button
                key={`${segment.offset}-${originalIndex}`}
                ref={isActiveParagraph ? activeParagraphRef : null}
                type="button"
                onClick={() => onSeek(segment.offset)}
                className={cn(
                  'focus-transcript-paragraph',
                  isActiveParagraph && 'is-active',
                )}
              >
                <span className="focus-transcript-time">{formatTimestamp(segment.offset)}</span>
                <span className="focus-transcript-text">
                  {segment.words.map((word, wordIndex) => (
                    <span
                      key={`${word.offset}-${wordIndex}`}
                      className={cn(
                        'focus-transcript-word',
                        isActiveParagraph &&
                          wordIndex === activeWordIndex &&
                          'is-active',
                      )}
                    >
                      {highlightText(word.text, query)}
                      {wordIndex < segment.words.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FocusNoteComposer({
  currentTime,
  noteType,
  onSave,
  compact = false,
  searchOpen = false,
  searchQuery = '',
  onSearchOpenChange,
  onSearchQueryChange,
}) {
  const [draft, setDraft] = useState('')
  const [favorite, setFavorite] = useState(false)
  const searchInputRef = useRef(null)

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus()
    }
  }, [searchOpen])

  const handleSave = () => {
    const content = draft.trim()
    if (!content && noteType !== 'checkpoint') return

    onSave({
      type: noteType,
      content,
      seconds: currentTime,
      favorite,
    })

    setDraft('')
    setFavorite(false)
  }

  return (
    <div
      className={cn(
        'focus-composer-panel',
        compact ? 'focus-composer-panel--compact' : 'focus-composer-panel--embedded',
      )}
    >
      <div className="focus-composer-header">
        <div className="focus-composer-header-start">
          <span className="focus-composer-time">{formatTimestamp(currentTime)}</span>
          {compact && onSearchOpenChange && (
            <>
              {searchOpen ? (
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange?.(event.target.value)}
                  placeholder="Search notes"
                  className="focus-notes-search-inline"
                  aria-label="Search notes"
                />
              ) : (
                <button
                  type="button"
                  className="focus-notes-search-toggle"
                  onClick={() => onSearchOpenChange(true)}
                  aria-label="Search notes"
                >
                  <Search size={15} strokeWidth={2.25} />
                </button>
              )}
            </>
          )}
        </div>
        <div className="focus-composer-header-actions">
          {compact && searchOpen && onSearchOpenChange && (
            <button
              type="button"
              className="focus-notes-search-close"
              onClick={() => {
                onSearchOpenChange(false)
                onSearchQueryChange?.('')
              }}
              aria-label="Close search"
            >
              <X size={15} strokeWidth={2.25} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setFavorite((value) => !value)}
            className={cn('focus-composer-favorite', favorite && 'is-active')}
            aria-label={favorite ? 'Save as favorite' : 'Do not save as favorite'}
            aria-pressed={favorite}
          >
            <Bookmark size={18} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={
          noteType === 'checkpoint'
            ? 'Checkpoint note at this moment…'
            : 'Note at this moment…'
        }
        className={cn('focus-composer-textarea', compact && 'focus-composer-textarea--compact')}
      />

      <div className="focus-composer-footer">
        <Button type="button" className="focus-composer-save w-full" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  )
}

const NOTE_TYPE_LABELS = {
  simpleText: 'Text',
  checkpoint: 'Checkpoint',
}

function getNotePreview(note) {
  const text = (note.content || note.title || '').trim()
  if (text) return text
  return note.type === 'checkpoint' ? 'Checkpoint' : 'Empty note'
}

function FocusNotesPanel({
  currentTime,
  noteType,
  notes,
  selectedNoteId,
  onSave,
  onSelectNote,
}) {
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!query.trim()) return notes
    const q = query.trim().toLowerCase()
    return notes.filter((note) => {
      const typeLabel = NOTE_TYPE_LABELS[note.type] ?? note.type
      return (
        (note.content || '').toLowerCase().includes(q) ||
        (note.title || '').toLowerCase().includes(q) ||
        typeLabel.toLowerCase().includes(q)
      )
    })
  }, [notes, query])

  return (
    <div className="focus-notes-panel">
      <FocusNoteComposer
        compact
        currentTime={currentTime}
        noteType={noteType}
        onSave={onSave}
        searchOpen={searchOpen}
        searchQuery={query}
        onSearchOpenChange={setSearchOpen}
        onSearchQueryChange={setQuery}
      />

      <div className="focus-notes-list">
        {filtered.length === 0 ? (
          <p className="focus-notes-empty">
            {notes.length === 0
              ? 'No notes for this video yet.'
              : 'No notes match your search.'}
          </p>
        ) : (
          filtered.map((note) => {
            const isSelected = selectedNoteId === note.id
            const typeLabel = NOTE_TYPE_LABELS[note.type] ?? note.type

            return (
              <button
                key={note.id}
                type="button"
                className={cn('focus-note-item', isSelected && 'is-selected')}
                onClick={() => onSelectNote(note)}
                aria-pressed={isSelected}
              >
                <div className="focus-note-item-header">
                  <div className="focus-note-item-meta">
                    {note.seconds != null && (
                      <span className="focus-note-time">{formatTimestamp(note.seconds)}</span>
                    )}
                    <span
                      className={cn(
                        'focus-note-type',
                        note.type === 'checkpoint' && 'focus-note-type--checkpoint',
                      )}
                    >
                      {typeLabel}
                    </span>
                  </div>
                  {note.favorite && (
                    <Bookmark
                      size={14}
                      className="focus-note-favorite shrink-0"
                      fill="currentColor"
                      aria-label="Favorite"
                    />
                  )}
                </div>
                <p className="focus-note-preview">
                  {highlightText(getNotePreview(note), query)}
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function FocusMode() {
  const {
    focus,
    activeCanvas,
    exitFocusMode,
    getCheckpointsForVideo,
    getTranscriptForVideo,
    addCheckpointFromVideo,
    addFocusNote,
    updateNodeData,
    registerPlayer,
    unregisterPlayer,
    setFocusActiveTab,
    setFocusLayout,
    applyFocusLayoutPreset,
    setFocusPlaybackHighlight,
    setFocusSelectedNote,
    getFocusNotesForVideo,
  } = useVoidTubeStore()
  const { handleLimitExceeded, refreshBilling } = useBilling()

  const videoNode = activeCanvas.nodes.find((n) => n.id === focus.videoNodeId)
  const open = Boolean(focus.active && videoNode)
  const focusPlayerId = focus.videoNodeId ? `focus-${focus.videoNodeId}` : null
  const activeTab = focus.activeTab ?? 'text'
  const transcriptPanelRef = useRef(null)

  const [transcriptState, setTranscriptState] = useState({
    status: 'idle',
    segments: [],
    error: null,
  })
  const [chaptersState, setChaptersState] = useState({
    status: 'idle',
    chapters: [],
    error: null,
  })

  const noteType = activeTab === 'checkpoint' ? 'checkpoint' : 'simpleText'

  const {
    containerRef,
    seekTo,
    isReady,
    loadError,
    currentTime,
    duration,
    playerState,
    togglePlay,
    skipBy,
    playbackRate,
    setPlaybackRate,
    play,
    getCurrentTimeFromPlayer,
    getDurationFromPlayer,
  } = useYouTubePlayer({
    videoId: open ? videoNode?.data?.videoId : null,
    timePollMs: 100,
  })

  const checkpoints = useMemo(
    () => (focus.videoNodeId ? getCheckpointsForVideo(focus.videoNodeId) : []),
    [focus.videoNodeId, getCheckpointsForVideo, activeCanvas.nodes],
  )

  const focusNotes = useMemo(
    () => (focus.videoNodeId ? getFocusNotesForVideo(focus.videoNodeId) : []),
    [focus.videoNodeId, getFocusNotesForVideo, activeCanvas.nodes],
  )

  const selectedNoteId = focus.selectedNoteId ?? null

  const timedBoardNodes = useMemo(() => {
    if (!focus.videoNodeId) return []
    return activeCanvas.nodes.filter(
      (node) =>
        node.data?.videoNodeId === focus.videoNodeId &&
        node.data?.seconds != null &&
        ['checkpoint', 'simpleText'].includes(node.type),
    )
  }, [activeCanvas.nodes, focus.videoNodeId])

  const linkedTranscript = useMemo(
    () => (focus.videoNodeId ? getTranscriptForVideo(focus.videoNodeId) : null),
    [focus.videoNodeId, getTranscriptForVideo, activeCanvas.nodes, activeCanvas.edges],
  )

  useEffect(() => {
    if (!open || !focusPlayerId) return undefined

    registerPlayer(focusPlayerId, {
      seekTo,
      play,
      getCurrentTime: getCurrentTimeFromPlayer,
      getDuration: getDurationFromPlayer,
    })

    return () => unregisterPlayer(focusPlayerId)
  }, [
    open,
    focusPlayerId,
    registerPlayer,
    unregisterPlayer,
    seekTo,
    play,
    getCurrentTimeFromPlayer,
    getDurationFromPlayer,
  ])

  useEffect(() => {
    if (!open) {
      setFocusPlaybackHighlight(null)
      return undefined
    }

    const syncBoardHighlight = () => {
      const time = getCurrentTimeFromPlayer()
      const activeNodes = timedBoardNodes.filter((node) =>
        isTimestampActive(node.data.seconds, time),
      )

      if (activeNodes.length === 0) {
        setFocusPlaybackHighlight(null)
        return
      }

      const closest = activeNodes.sort(
        (a, b) =>
          Math.abs(a.data.seconds - time) - Math.abs(b.data.seconds - time),
      )[0]

      setFocusPlaybackHighlight(closest.id)
    }

    syncBoardHighlight()
    const interval = setInterval(syncBoardHighlight, 250)
    return () => clearInterval(interval)
  }, [
    open,
    timedBoardNodes,
    getCurrentTimeFromPlayer,
    setFocusPlaybackHighlight,
  ])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') exitFocusMode()
      if (
        event.key.toLowerCase() === 'n' &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target instanceof HTMLInputElement)
      ) {
        event.preventDefault()
        addFocusNote(focus.videoNodeId, 'checkpoint', {
          seconds: getCurrentTimeFromPlayer(),
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, exitFocusMode, addFocusNote, focus.videoNodeId, getCurrentTimeFromPlayer])

  useEffect(() => {
    if (!open) {
      setTranscriptState({ status: 'idle', segments: [], error: null })
      setChaptersState({ status: 'idle', chapters: [], error: null })
      return
    }

    if (linkedTranscript?.segments?.length) {
      setTranscriptState({
        status: 'ready',
        segments: linkedTranscript.segments,
        error: null,
      })
    } else {
      setTranscriptState({ status: 'idle', segments: [], error: null })
    }

    const cached = videoNode?.data?.descriptionChapters
    if (Array.isArray(cached) && cached.length >= 2) {
      setChaptersState({ status: 'ready', chapters: cached, error: null })
    } else {
      setChaptersState({ status: 'idle', chapters: [], error: null })
    }
  }, [open, linkedTranscript?.nodeId, linkedTranscript?.segments, videoNode?.data?.descriptionChapters])

  useEffect(() => {
    if (!open || activeTab !== 'transcript') return
    transcriptPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [open, activeTab])

  const loadTranscript = useCallback(async () => {
    const videoId = videoNode?.data?.videoId
    if (!videoId) return

    setTranscriptState((prev) => ({ ...prev, status: 'loading', error: null }))

    try {
      const segments = await fetchTranscript(videoId)
      setTranscriptState({ status: 'ready', segments, error: null })

      if (linkedTranscript?.nodeId) {
        updateNodeData(linkedTranscript.nodeId, {
          segments,
          status: 'ready',
          videoId,
          error: null,
        })
      }
      refreshBilling()
    } catch (err) {
      const message = handleLimitExceeded(err)
        ? 'Monthly transcript limit reached'
        : err.message || 'Could not load transcript.'
      setTranscriptState({
        status: 'error',
        segments: [],
        error: message,
      })
    }
  }, [videoNode?.data?.videoId, linkedTranscript?.nodeId, updateNodeData, handleLimitExceeded, refreshBilling])

  const loadChapters = useCallback(async () => {
    const videoId = videoNode?.data?.videoId
    if (!videoId) return

    setChaptersState((prev) => ({ ...prev, status: 'loading', error: null }))

    try {
      const { chapters, description } = await fetchVideoChapters(videoId)
      setChaptersState({ status: 'ready', chapters, error: null })

      if (chapters.length >= 2) {
        updateNodeData(focus.videoNodeId, {
          descriptionChapters: chapters,
          description: description || videoNode.data.description || '',
        })
      }
    } catch (err) {
      setChaptersState({
        status: 'error',
        chapters: [],
        error: err.message || 'Could not load chapters.',
      })
    }
  }, [videoNode, focus.videoNodeId, updateNodeData])

  const handleSeekToTime = useCallback(
    (seconds, highlightNodeId = null) => {
      if (seconds == null) return
      seekTo(seconds)
      play()
      if (highlightNodeId) setFocusPlaybackHighlight(highlightNodeId)
    },
    [seekTo, play, setFocusPlaybackHighlight],
  )

  const handleComposerSave = useCallback(
    ({ type, content, seconds, favorite }) => {
      if (!focus.videoNodeId) return
      addFocusNote(focus.videoNodeId, type, { seconds, content, favorite })
    },
    [addFocusNote, focus.videoNodeId],
  )

  const handleSelectNote = useCallback(
    (note) => {
      setFocusSelectedNote(note.id)
      if (note.seconds != null) {
        handleSeekToTime(note.seconds, note.id)
      } else {
        setFocusPlaybackHighlight(note.id)
      }
    },
    [setFocusSelectedNote, handleSeekToTime, setFocusPlaybackHighlight],
  )

  const focusPanels = useMemo(
    () => ({
      video: (
        <div className="focus-panel-video flex h-full min-h-0 flex-col">
          <div className="video-player-shell relative min-h-[140px] flex-1 overflow-hidden rounded-xl bg-black">
            <YouTubePlayerContainer
              key={videoNode?.data?.videoId || 'focus'}
              containerRef={containerRef}
              className="h-full w-full min-h-[140px]"
            />
            {!isReady && !loadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <p className="text-xs text-muted-foreground">Loading video…</p>
              </div>
            )}
            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted p-4 text-center">
                <p className="text-xs text-destructive">{loadError}</p>
              </div>
            )}
            {isReady && (
              <>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute inset-0 z-[1] flex items-center justify-center bg-black/0 transition hover:bg-black/10"
                  aria-label={playerState === 1 ? 'Pause' : 'Play'}
                >
                  {playerState !== 1 && (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm">
                      <Play size={28} className="ml-1" fill="currentColor" />
                    </span>
                  )}
                </button>
                <VideoTimeline
                  currentTime={currentTime}
                  duration={duration}
                  isPlaying={playerState === 1}
                  playbackRate={playbackRate}
                  checkpoints={checkpoints}
                  onSeek={(seconds, checkpointId) =>
                    handleSeekToTime(seconds, checkpointId ?? null)
                  }
                  onAddCheckpoint={(seconds) =>
                    addCheckpointFromVideo(focus.videoNodeId, seconds)
                  }
                  onTogglePlay={togglePlay}
                  onSkipBack={() => skipBy(-10)}
                  onSkipForward={() => skipBy(10)}
                  onPlaybackRateChange={setPlaybackRate}
                />
              </>
            )}
          </div>
        </div>
      ),
      transcript: (
        <FocusTranscriptPanel
          panelRef={transcriptPanelRef}
          segments={transcriptState.segments}
          status={transcriptState.status}
          error={transcriptState.error}
          currentTime={currentTime}
          onSeek={(seconds) => handleSeekToTime(seconds)}
          onLoad={loadTranscript}
          chapters={chaptersState.chapters}
          chaptersStatus={chaptersState.status}
          onLoadChapters={loadChapters}
        />
      ),
      notes: (
        <FocusNotesPanel
          currentTime={currentTime}
          noteType={noteType}
          notes={focusNotes}
          selectedNoteId={selectedNoteId}
          onSave={handleComposerSave}
          onSelectNote={handleSelectNote}
        />
      ),
    }),
    [
      videoNode?.data?.videoId,
      containerRef,
      isReady,
      loadError,
      togglePlay,
      playerState,
      currentTime,
      duration,
      playbackRate,
      checkpoints,
      handleSeekToTime,
      addCheckpointFromVideo,
      focus.videoNodeId,
      skipBy,
      setPlaybackRate,
      transcriptState,
      chaptersState,
      loadTranscript,
      loadChapters,
      noteType,
      handleComposerSave,
      focusNotes,
      selectedNoteId,
      handleSelectNote,
    ],
  )

  return (
    <AnimatePresence mode="wait">
      {open && videoNode && (
        <motion.div
          className="focus-mode-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="focus-mode-shell"
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={FOCUS_SPRING}
          >
            <FocusModeTabBar
              activeTab={activeTab}
              onChange={setFocusActiveTab}
              onClose={exitFocusMode}
            />

            <FocusSplitLayout
              layout={focus.layout ?? DEFAULT_FOCUS_LAYOUT}
              panels={focusPanels}
              onLayoutChange={setFocusLayout}
              onApplyPreset={applyFocusLayoutPreset}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

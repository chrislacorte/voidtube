import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { useRef, useState } from 'react'
import { isTimestampActive } from '../../lib/timestamp'
import { formatTimestamp } from '../../lib/youtube'

const DRAG_THRESHOLD_PX = 5
const SKIP_SECONDS = 10
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export default function VideoTimeline({
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  checkpoints,
  onSeek,
  onAddCheckpoint,
  onTogglePlay,
  onSkipBack,
  onSkipForward,
  onPlaybackRateChange,
}) {
  const trackRef = useRef(null)
  const dragRef = useRef({ active: false, startX: 0, moved: false })
  const [isDragging, setIsDragging] = useState(false)

  const safeDuration = duration > 0 ? duration : 1
  const progress = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100))

  const secondsFromEvent = (clientX) => {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return ratio * safeDuration
  }

  const handlePointerDown = (e) => {
    if (e.target.closest('[data-checkpoint-marker]')) return
    if (e.target.closest('[data-playhead]')) return
    dragRef.current = { active: true, startX: e.clientX, moved: false }
    setIsDragging(true)
    trackRef.current?.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!dragRef.current.active) return
    if (Math.abs(e.clientX - dragRef.current.startX) > DRAG_THRESHOLD_PX) {
      dragRef.current.moved = true
      onSeek(secondsFromEvent(e.clientX))
    }
  }

  const handlePointerUp = (e) => {
    if (!dragRef.current.active) return
    trackRef.current?.releasePointerCapture(e.pointerId)
    setIsDragging(false)

    if (!dragRef.current.moved && !e.target.closest('[data-checkpoint-marker]')) {
      const seconds = secondsFromEvent(e.clientX)
      onSeek(seconds)
      onAddCheckpoint(seconds)
    }

    dragRef.current = { active: false, startX: 0, moved: false }
  }

  const handleMarkerClick = (e, seconds, checkpointId) => {
    e.stopPropagation()
    onSeek(seconds, checkpointId)
  }

  const motionClass = isDragging ? '' : 'video-timeline-playhead--animated'

  return (
    <div className="video-timeline-overlay nodrag nowheel nopan absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-2 pb-2 pt-6">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onSkipBack}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
          aria-label={`Back ${SKIP_SECONDS} seconds`}
          title={`−${SKIP_SECONDS}s`}
        >
          <RotateCcw size={13} />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={onSkipForward}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
          aria-label={`Forward ${SKIP_SECONDS} seconds`}
          title={`+${SKIP_SECONDS}s`}
        >
          <RotateCw size={13} />
        </button>

        <div
          ref={trackRef}
          className="video-timeline-track relative mx-1 h-2 min-w-0 flex-1 cursor-pointer rounded-full bg-white/15"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div
            className={`video-timeline-progress absolute inset-y-0 left-0 rounded-full bg-red-500/35 ${motionClass}`}
            style={{ width: `${progress}%` }}
          />
          <div
            data-playhead
            className={`video-timeline-playhead pointer-events-none absolute top-1/2 z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow-md ${motionClass}`}
            style={{ left: `${progress}%` }}
          />
          {checkpoints.map((cp) => {
            const left = (cp.seconds / safeDuration) * 100
            const active = isTimestampActive(cp.seconds, currentTime)
            return (
              <button
                key={cp.id}
                type="button"
                data-checkpoint-marker
                title={formatTimestamp(cp.seconds)}
                onClick={(e) => handleMarkerClick(e, cp.seconds, cp.id)}
                className={`absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-200 bg-red-500 transition hover:scale-125 ${
                  active ? 'checkpoint-active scale-125' : ''
                }`}
                style={{ left: `${left}%` }}
              />
            )
          })}
        </div>

        <select
          value={playbackRate}
          onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
          className="h-7 shrink-0 cursor-pointer rounded border border-white/10 bg-white/10 px-1 text-[10px] text-white/80 outline-none hover:bg-white/15"
          aria-label="Playback speed"
          title="Speed"
        >
          {PLAYBACK_RATES.map((rate) => (
            <option key={rate} value={rate} className="bg-[#1a1a1a]">
              {rate === 1 ? '1×' : `${rate}×`}
            </option>
          ))}
        </select>

        <span className="shrink-0 font-mono text-[10px] text-white/60">
          {formatTimestamp(currentTime)} / {formatTimestamp(safeDuration)}
        </span>
      </div>
    </div>
  )
}

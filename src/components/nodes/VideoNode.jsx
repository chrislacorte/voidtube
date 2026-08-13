import { Focus, Play, X } from 'lucide-react'
import { Handle, NodeResizer, Position, useUpdateNodeInternals } from '@xyflow/react'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import YouTubePlayerContainer from '../YouTubePlayerContainer'
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer'
import { useVoidTubeStore } from '../../stores/useVoidTubeStore'
import { useNodeActions } from './NodeShell'
import VideoTimeline from './VideoTimeline'

const MIN_WIDTH = 280
const MIN_HEIGHT = 240

function VideoNode({ id, data, selected }) {
  const shellRef = useRef(null)
  const updateNodeInternals = useUpdateNodeInternals()
  const {
    registerPlayer,
    unregisterPlayer,
    getCheckpointsForVideo,
    addCheckpointFromVideo,
    enterFocusMode,
    updateNodeSize,
  } = useVoidTubeStore()
  const { deleteNode } = useNodeActions(id)

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
    resizePlayer,
  } = useYouTubePlayer({
    videoId: data.videoId,
  })

  const setPlayerContainerRef = useCallback(
    (node) => {
      containerRef(node)
    },
    [containerRef],
  )

  const checkpoints = useMemo(() => getCheckpointsForVideo(id), [getCheckpointsForVideo, id])

  useEffect(() => {
    registerPlayer(id, {
      seekTo,
      play,
      getCurrentTime: getCurrentTimeFromPlayer,
      getDuration: getDurationFromPlayer,
    })
    return () => unregisterPlayer(id)
  }, [
    id,
    registerPlayer,
    unregisterPlayer,
    seekTo,
    play,
    getCurrentTimeFromPlayer,
    getDurationFromPlayer,
  ])

  useEffect(() => {
    const el = shellRef.current
    if (!el || !resizePlayer) return

    const observer = new ResizeObserver(() => {
      const shell = el.querySelector('.video-player-shell')
      if (!shell) return
      resizePlayer(shell.clientWidth, shell.clientHeight)
      updateNodeInternals(id)
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [id, resizePlayer, updateNodeInternals])

  const handleResize = useCallback(
    (_, params) => {
      updateNodeSize(id, params.width, params.height)
      updateNodeInternals(id)
    },
    [id, updateNodeSize, updateNodeInternals],
  )

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        maxWidth={900}
        maxHeight={720}
        handleClassName="!h-3 !w-3 !rounded-full !border-2 !border-primary !bg-background"
        lineClassName="!border-primary/40"
        onResize={handleResize}
        onResizeEnd={handleResize}
      />

      <div
        ref={shellRef}
        className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-lg"
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-border !bg-primary"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-border !bg-primary"
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="video-player-shell relative min-h-0 flex-1 overflow-hidden bg-muted">
            <YouTubePlayerContainer
              key={data.videoId || id}
              containerRef={setPlayerContainerRef}
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
                  className="nodrag nopan absolute inset-0 z-[1] flex items-center justify-center bg-black/0 transition hover:bg-black/10"
                  aria-label={playerState === 1 ? 'Pause' : 'Play'}
                >
                  {playerState !== 1 && (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm">
                      <Play size={24} className="ml-1" fill="currentColor" />
                    </span>
                  )}
                </button>
                <VideoTimeline
                  currentTime={currentTime}
                  duration={duration}
                  isPlaying={playerState === 1}
                  playbackRate={playbackRate}
                  checkpoints={checkpoints}
                  onSeek={seekTo}
                  onAddCheckpoint={(seconds) => addCheckpointFromVideo(id, seconds)}
                  onTogglePlay={togglePlay}
                  onSkipBack={() => skipBy(-10)}
                  onSkipForward={() => skipBy(10)}
                  onPlaybackRateChange={setPlaybackRate}
                />
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => deleteNode()}
            className="nodrag nopan absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm transition hover:bg-destructive hover:text-white"
            aria-label="Remove video"
          >
            <X size={14} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={() => enterFocusMode(id)}
            className="nodrag nopan absolute left-2 top-2 z-20 flex h-7 items-center gap-1 rounded-full bg-background/90 px-2.5 text-[10px] font-medium text-primary shadow-sm transition hover:bg-accent"
            title="Focus Mode"
          >
            <Focus size={12} />
            Focus
          </button>
        </div>

        <div className="shrink-0 border-t border-border px-3 py-2.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {data.title || 'Video Title'}
          </h3>
          {data.channelTitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{data.channelTitle}</p>
          )}
          {data.description && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {data.description}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

export default memo(VideoNode)

import { useCallback, useEffect, useRef, useState } from 'react'

let ytApiPromise = null

function loadYouTubeAPI() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise((resolve, reject) => {
    const finish = (YT) => {
      clearInterval(check)
      clearTimeout(timeout)
      resolve(YT)
    }

    const fail = (err) => {
      clearInterval(check)
      clearTimeout(timeout)
      ytApiPromise = null
      reject(err)
    }

    const check = setInterval(() => {
      if (window.YT?.Player) finish(window.YT)
    }, 100)

    const timeout = setTimeout(() => {
      fail(new Error('YouTube Iframe API timeout'))
    }, 20000)

    window.onYouTubeIframeAPIReady = () => {
      if (window.YT?.Player) finish(window.YT)
    }

    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]')
    if (!existing) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.onerror = () => fail(new Error('Failed to load YouTube Iframe API'))
      document.head.appendChild(tag)
    }
  })

  return ytApiPromise
}

export { loadYouTubeAPI }

function getSizeElement(el) {
  if (!el) return null
  if (el.tagName === 'IFRAME') return el.parentElement
  if (el.isConnected && el.parentElement?.dataset?.ytShell != null) return el.parentElement
  if (el.parentElement?.dataset?.ytShell != null) return el.parentElement
  return el
}

function getLayoutSize(el) {
  const sized = getSizeElement(el)
  if (!sized) return { width: 0, height: 0 }
  return {
    width: sized.clientWidth,
    height: sized.clientHeight,
  }
}

function hasUsableSize(el) {
  const { width, height } = getLayoutSize(el)
  // Use layout size (not getBoundingClientRect) so React Flow zoom doesn't block init.
  return width >= 48 && height >= 48
}

export function useYouTubePlayer({ videoId, timePollMs = 250 }) {
  const [containerEl, setContainerEl] = useState(null)
  const [player, setPlayer] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playerState, setPlayerState] = useState(-1)
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const playerRef = useRef(null)

  const containerRef = useCallback((node) => {
    setContainerEl(node)
  }, [])

  useEffect(() => {
    if (!videoId || !containerEl) return

    let ytPlayer = null
    let pollInterval = null
    let sizeObserver = null
    let cancelled = false

    const createPlayer = (YT) => {
      if (cancelled || !containerEl) return

      const { width, height } = getLayoutSize(containerEl)
      const playerWidth = Math.max(48, Math.floor(width))
      const playerHeight = Math.max(48, Math.floor(height))

      ytPlayer = new YT.Player(containerEl, {
        videoId,
        width: playerWidth,
        height: playerHeight,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return
            const p = event.target
            playerRef.current = p
            setPlayer(p)
            setIsReady(true)
            setLoadError(null)
            if (p.getDuration) setDuration(p.getDuration())
            if (p.getPlaybackRate) setPlaybackRateState(p.getPlaybackRate())
            const iframe = p.getIframe?.()
            const { width: layoutW, height: layoutH } = getLayoutSize(iframe ?? containerEl)
            if (p.setSize && layoutW > 0 && layoutH > 0) {
              p.setSize(Math.floor(layoutW), Math.floor(layoutH))
            }
          },
          onStateChange: (event) => {
            if (cancelled) return
            setPlayerState(event.data)
          },
          onError: (event) => {
            if (cancelled) return
            setLoadError(`Video could not be loaded (error ${event.data})`)
            setIsReady(false)
          },
        },
      })
    }

    const boot = () => {
      loadYouTubeAPI()
        .then((YT) => {
          if (cancelled || !containerEl) return
          createPlayer(YT)
        })
        .catch((err) => {
          console.warn('YouTube player init failed:', err)
          if (!cancelled) setLoadError(err.message || 'YouTube API unavailable')
        })
    }

    if (hasUsableSize(containerEl)) {
      boot()
    } else {
      sizeObserver = new ResizeObserver(() => {
        if (cancelled || !containerEl || !hasUsableSize(containerEl)) return
        sizeObserver?.disconnect()
        sizeObserver = null
        boot()
      })
      sizeObserver.observe(containerEl)
    }

    pollInterval = setInterval(() => {
      const p = playerRef.current
      if (p?.getCurrentTime) setCurrentTime(p.getCurrentTime())
      if (p?.getDuration) {
        const d = p.getDuration()
        if (d > 0) setDuration(d)
      }
    }, timePollMs)

    return () => {
      cancelled = true
      sizeObserver?.disconnect()
      if (pollInterval) clearInterval(pollInterval)
      if (ytPlayer?.destroy) {
        try {
          ytPlayer.destroy()
        } catch {
          // already destroyed
        }
      }
      playerRef.current = null
      setPlayer(null)
      setIsReady(false)
      setLoadError(null)
      setPlaybackRateState(1)
    }
  }, [videoId, containerEl, timePollMs])

  const seekTo = useCallback((seconds) => {
    const p = playerRef.current
    if (p?.seekTo) {
      const max = p.getDuration?.() ?? seconds
      const clamped = Math.max(0, Math.min(seconds, max > 0 ? max : seconds))
      p.seekTo(clamped, true)
      setCurrentTime(clamped)
    }
  }, [])

  const skipBy = useCallback(
    (delta) => {
      const p = playerRef.current
      if (!p?.getCurrentTime || !p?.seekTo) return
      seekTo(p.getCurrentTime() + delta)
    },
    [seekTo],
  )

  const setPlaybackRate = useCallback((rate) => {
    const p = playerRef.current
    if (p?.setPlaybackRate) {
      p.setPlaybackRate(rate)
      setPlaybackRateState(rate)
    }
  }, [])

  const play = useCallback(() => {
    playerRef.current?.playVideo?.()
  }, [])

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo?.()
  }, [])

  const togglePlay = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    if (p.getPlayerState?.() === 1) p.pauseVideo()
    else p.playVideo()
  }, [])

  const getCurrentTimeFromPlayer = useCallback(() => {
    return playerRef.current?.getCurrentTime?.() ?? currentTime
  }, [currentTime])

  const getDurationFromPlayer = useCallback(() => {
    return playerRef.current?.getDuration?.() ?? duration
  }, [duration])

  const resizePlayer = useCallback((width, height) => {
    const p = playerRef.current
    if (p?.setSize && width > 0 && height > 0) {
      p.setSize(Math.floor(width), Math.floor(height))
    }
  }, [])

  return {
    containerRef,
    player,
    isReady,
    loadError,
    currentTime,
    duration,
    playerState,
    seekTo,
    play,
    pause,
    togglePlay,
    skipBy,
    playbackRate,
    setPlaybackRate,
    getCurrentTimeFromPlayer,
    getDurationFromPlayer,
    resizePlayer,
  }
}

export function extractVideoId(url) {
  if (!url || typeof url !== 'string') return null

  const trimmed = url.trim()

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }

  try {
    const parsed = new URL(trimmed)

    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0]
      return id.length === 11 ? id : null
    }

    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v')
      if (v && v.length === 11) return v

      const embedMatch = parsed.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
      if (embedMatch) return embedMatch[1]

      const shortsMatch = parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)
      if (shortsMatch) return shortsMatch[1]
    }
  } catch {
    const match = trimmed.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    )
    if (match) return match[1]
  }

  return null
}

export function formatTimestamp(seconds) {
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

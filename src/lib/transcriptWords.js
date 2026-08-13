/**
 * Word-level transcript helpers. Uses segment.words when present;
 * otherwise interpolates timings across tokens by character weight.
 */

export function interpolateWords(segment) {
  const text = (segment.text ?? '').trim()
  if (!text) return []

  const wordTokens = text.split(/\s+/).filter(Boolean)
  if (wordTokens.length === 0) return []

  const duration = Math.max(segment.duration ?? 2, 0.1)
  const totalWeight = wordTokens.reduce((sum, word) => sum + Math.max(word.length, 1), 0)
  let cursor = segment.offset ?? 0

  return wordTokens.map((word) => {
    const weight = Math.max(word.length, 1) / totalWeight
    const wordDuration = duration * weight
    const entry = { text: word, offset: cursor, duration: wordDuration }
    cursor += wordDuration
    return entry
  })
}

export function ensureSegmentWords(segment) {
  if (Array.isArray(segment.words) && segment.words.length > 0) {
    return segment.words
  }
  return interpolateWords(segment)
}

export function ensureSegmentsWords(segments) {
  return (segments ?? []).map((segment) => ({
    ...segment,
    words: ensureSegmentWords(segment),
  }))
}

export function getActiveSegmentIndex(segments, currentTime) {
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (currentTime >= segments[i].offset) return i
  }
  return -1
}

export function getActiveWordIndex(words, currentTime) {
  if (!words?.length) return -1

  for (let i = words.length - 1; i >= 0; i -= 1) {
    const word = words[i]
    const end = word.offset + (word.duration ?? 0)
    if (currentTime >= word.offset && currentTime < end + 0.05) return i
  }

  for (let i = words.length - 1; i >= 0; i -= 1) {
    if (currentTime >= words[i].offset) return i
  }

  return -1
}

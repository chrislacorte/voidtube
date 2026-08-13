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

export function parseSrv3Words(innerXml, segmentStart) {
  const words = []
  const regex = /<s\b[^>]*\bt="(\d+(?:\.\d+)?)"[^>]*\bd="(\d+(?:\.\d+)?)"[^>]*>([\s\S]*?)<\/s>/g
  let match

  while ((match = regex.exec(innerXml)) !== null) {
    const text = match[3].replace(/<[^>]+>/g, '').trim()
    if (!text) continue

    const tMs = parseFloat(match[1])
    const dMs = parseFloat(match[2])
    words.push({
      text,
      offset: segmentStart + tMs / 1000,
      duration: Math.max(dMs / 1000, 0.05),
    })
  }

  return words
}

export function enrichSegmentWithWords(segment, innerXml = null) {
  const parsedWords = innerXml ? parseSrv3Words(innerXml, segment.offset) : []
  return {
    ...segment,
    words: parsedWords.length > 0 ? parsedWords : interpolateWords(segment),
  }
}

/**
 * Parse chapter timestamps from a YouTube video description.
 * Supports common formats: 0:00 Title, (1:23) Title, 1:23:45 - Title, [0:00] | Title
 */
export function parseTimestampToSeconds(value) {
  if (!value) return null
  const parts = value.trim().split(':').map((part) => Number.parseInt(part, 10))
  if (parts.some((part) => Number.isNaN(part))) return null

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return null
}

const CHAPTER_LINE =
  /^[\s>*-]*(?:[\[(]\s*)?((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\s*[\])])?\s*(?:[-–—|:|·]\s*|\s+)(.+)$/

export function parseDescriptionChapters(description) {
  if (!description || typeof description !== 'string') return []

  const chapters = []

  for (const line of description.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const match = trimmed.match(CHAPTER_LINE)
    if (!match) continue

    const seconds = parseTimestampToSeconds(match[1])
    const title = match[2]?.trim()
    if (seconds == null || !title) continue

    chapters.push({ seconds, title })
  }

  const unique = []
  const seen = new Set()
  for (const chapter of chapters.sort((a, b) => a.seconds - b.seconds)) {
    const key = `${chapter.seconds}:${chapter.title}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(chapter)
  }

  return unique.length >= 2 ? unique : []
}

const STOP_WORDS =
  /\b(bitte|erstelle|mir|eine|playlist|mit|den|besten|youtube|tutorials|videos|zum|thema|lernen|learn|create|make|me|for|the|about|of|und|oder|oder|show|find|search)\b/gi

const TOPIC_PATTERNS = [
  /(?:zum thema|thema|about|for|für|on|zu)\s+["']?([^"'.!?]+?)["']?(?:\s*[.!?]|$)/i,
  /(?:programmiersprache|language)\s+["']?([^"'.!?]+?)["']?(?:\s*[.!?]|$)/i,
  /(?:lernen|learn)[:\s]+["']?([^"'.!?]+?)["']?(?:\s*[.!?]|$)/i,
  /["']([^"']{2,60})["']/,
]

function detectLanguage(text) {
  if (/\b(deutsch|german|auf deutsch)\b/i.test(text)) return 'de'
  if (/\b(english|englisch)\b/i.test(text)) return 'en'
  if (/[äöüß]/i.test(text)) return 'de'
  return 'de'
}

function extractTopic(text) {
  for (const pattern of TOPIC_PATTERNS) {
    const match = text.match(pattern)
    if (match?.[1]?.trim()) return match[1].trim()
  }

  const cleaned = text
    .replace(STOP_WORDS, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length >= 2) return cleaned.slice(0, 60)
  return text.trim().slice(0, 60)
}

function buildQueries(topic, language) {
  const queries =
    language === 'de'
      ? [
          `${topic} tutorial deutsch anfänger`,
          `${topic} programmieren lernen`,
          `beste ${topic} tutorial`,
        ]
      : [
          `${topic} tutorial beginner`,
          `${topic} programming course`,
          `best ${topic} tutorial`,
        ]

  return [...new Set(queries.map((q) => q.replace(/\s+/g, ' ').trim()))].slice(0, 3)
}

export function parsePlaylistIntentHeuristic(prompt, maxResults = 8) {
  const text = prompt?.trim()
  if (!text) {
    throw new Error('Prompt required')
  }

  const topic = extractTopic(text)
  const language = detectLanguage(text)
  const count = Math.min(Math.max(Number(maxResults) || 8, 4), 12)

  return {
    title: `${topic} Tutorials`,
    topic,
    language,
    queries: buildQueries(topic, language),
    count,
    source: 'heuristic',
  }
}

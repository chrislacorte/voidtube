import { parsePlaylistIntentHeuristic } from './playlistIntentHeuristic.js'

const SYSTEM_PROMPT = `You extract structured playlist search plans from user prompts about YouTube learning playlists.
Respond with ONLY valid JSON (no markdown) matching this schema:
{
  "title": "short playlist title",
  "topic": "main topic",
  "language": "de" or "en",
  "queries": ["youtube search query 1", "youtube search query 2"],
  "count": 8
}
Rules:
- queries: 2-3 diverse YouTube search strings optimized for tutorials
- count: integer 4-12, default 8
- language: infer from user prompt (default de for German prompts)
- title: concise, e.g. "PHP Tutorials"`

function normalizePlan(raw, fallbackCount) {
  const count = Math.min(Math.max(Number(raw.count) || fallbackCount || 8, 4), 12)
  const topic = String(raw.topic || raw.title || 'Tutorial').trim()
  const language = raw.language === 'en' ? 'en' : 'de'
  const queries = Array.isArray(raw.queries)
    ? raw.queries.map((q) => String(q).trim()).filter(Boolean)
    : []

  const title = String(raw.title || `${topic} Tutorials`).trim()

  return {
    title,
    topic,
    language,
    queries: queries.length > 0 ? queries.slice(0, 3) : parsePlaylistIntentHeuristic(topic, count).queries,
    count,
    source: 'ai',
  }
}

function parseJsonFromText(text) {
  const trimmed = text.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in AI response')
  return JSON.parse(jsonMatch[0])
}

export async function parseWithWorkersAI(prompt, ai, maxResults = 8) {
  const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    max_tokens: 512,
    temperature: 0.2,
  })

  const text = response?.response ?? response?.result?.response ?? ''
  if (!text) throw new Error('Empty AI response')

  const parsed = parseJsonFromText(text)
  return normalizePlan(parsed, maxResults)
}

export async function parsePlaylistIntent(prompt, options = {}) {
  const { ai = null, maxResults = 8 } = options
  const text = prompt?.trim()

  if (!text) {
    throw new Error('Prompt required')
  }

  if (ai) {
    try {
      return await parseWithWorkersAI(text, ai, maxResults)
    } catch (err) {
      console.warn('[playlistIntent] AI failed, using heuristic:', err.message)
    }
  }

  return parsePlaylistIntentHeuristic(text, maxResults)
}

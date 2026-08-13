import { createUsageGate } from '../../server/lib/usageGate.js'
import { handlePolarWebhook } from '../../server/lib/polarWebhook.js'
import { validateLicenseKey } from '../../server/lib/polarValidate.js'
import { validateLicenseKeyInput } from '../../server/lib/billingValidate.js'
import { corsHeaders, jsonResponse } from '../../server/lib/apiCors.js'
import { fetchTranscriptSegments } from '../../server/lib/youtubeTranscriptCore.js'

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function parseTimestampToSeconds(value) {
  if (!value) return null
  const parts = value.trim().split(':').map((part) => Number.parseInt(part, 10))
  if (parts.some((part) => Number.isNaN(part))) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return null
}

const CHAPTER_LINE =
  /^[\s>*-]*(?:[\[(]\s*)?((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\s*[\])])?\s*(?:[-–—|:|·]\s*|\s+)(.+)$/

function parseDescriptionChapters(description) {
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

async function searchYouTubeVideosInline(query, apiKey, maxResults = 12) {
  const q = query?.trim()
  const limit = Math.min(Number(maxResults) || 12, 25)
  if (!q) throw new Error('Suchbegriff fehlt')

  const api = new URL('https://www.googleapis.com/youtube/v3/search')
  api.searchParams.set('part', 'snippet')
  api.searchParams.set('q', q)
  api.searchParams.set('type', 'video')
  api.searchParams.set('maxResults', String(limit))
  api.searchParams.set('key', apiKey.trim())

  const response = await fetch(api)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'YouTube search failed')

  return (data.items ?? [])
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl:
        item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
    }))
}

const PLAYLIST_STOP_WORDS =
  /\b(bitte|erstelle|mir|eine|playlist|mit|den|besten|youtube|tutorials|videos|zum|thema|lernen|learn|create|make|me|for|the|about|of|und|oder|show|find|search)\b/gi

function parsePlaylistIntentHeuristic(prompt, maxResults = 8) {
  const text = prompt?.trim()
  if (!text) throw new Error('Prompt required')

  const patterns = [
    /(?:zum thema|thema|about|for|für|on|zu)\s+["']?([^"'.!?]+?)["']?(?:\s*[.!?]|$)/i,
    /(?:programmiersprache|language)\s+["']?([^"'.!?]+?)["']?(?:\s*[.!?]|$)/i,
    /(?:lernen|learn)[:\s]+["']?([^"'.!?]+?)["']?(?:\s*[.!?]|$)/i,
    /["']([^"']{2,60})["']/,
  ]

  let topic = ''
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]?.trim()) {
      topic = match[1].trim()
      break
    }
  }

  if (!topic) {
    topic = text.replace(PLAYLIST_STOP_WORDS, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
  }

  const language = /[äöüß]/i.test(text) || /\bdeutsch\b/i.test(text) ? 'de' : 'de'
  const count = Math.min(Math.max(Number(maxResults) || 8, 4), 12)
  const queries =
    language === 'de'
      ? [`${topic} tutorial deutsch anfänger`, `${topic} programmieren lernen`, `beste ${topic} tutorial`]
      : [`${topic} tutorial beginner`, `${topic} programming course`, `best ${topic} tutorial`]

  return {
    title: `${topic} Tutorials`,
    topic,
    language,
    queries: [...new Set(queries)].slice(0, 3),
    count,
    source: 'heuristic',
  }
}

async function parsePlaylistIntentWithAI(prompt, ai, maxResults) {
  const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      {
        role: 'system',
        content:
          'Extract a YouTube playlist search plan. Reply ONLY with JSON: {"title":"","topic":"","language":"de|en","queries":["",""],"count":8}',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 512,
    temperature: 0.2,
  })

  const text = response?.response ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')

  const raw = JSON.parse(jsonMatch[0])
  const fallback = parsePlaylistIntentHeuristic(prompt, maxResults)
  return {
    title: String(raw.title || fallback.title).trim(),
    topic: String(raw.topic || fallback.topic).trim(),
    language: raw.language === 'en' ? 'en' : 'de',
    queries: Array.isArray(raw.queries) && raw.queries.length > 0 ? raw.queries.slice(0, 3) : fallback.queries,
    count: Math.min(Math.max(Number(raw.count) || maxResults || 8, 4), 12),
    source: 'ai',
  }
}

async function parsePlaylistIntent(prompt, env, maxResults) {
  if (env.AI) {
    try {
      return await parsePlaylistIntentWithAI(prompt, env.AI, maxResults)
    } catch {
      // fall through to heuristic
    }
  }
  return parsePlaylistIntentHeuristic(prompt, maxResults)
}

function scorePlaylistVideo(video, plan) {
  let score = 0
  const title = (video.title ?? '').toLowerCase()
  const topic = (plan.topic ?? '').toLowerCase()
  if (topic && title.includes(topic)) score += 12
  if (/tutorial|kurs|course|lernen|learn|anfänger|beginner/i.test(title)) score += 4
  if (plan.language === 'de' && /deutsch|german/i.test(title)) score += 3
  if (/shorts/i.test(title)) score -= 4
  return score
}

async function generatePlaylistFromPrompt(prompt, apiKey, env, maxResults = 8) {
  const plan = await parsePlaylistIntent(prompt, env, maxResults)
  const perQuery = Math.min(Math.ceil((plan.count * 1.5) / plan.queries.length), 12)

  const searches = await Promise.all(
    plan.queries.map((query) =>
      searchYouTubeVideosInline(query, apiKey, perQuery).catch(() => []),
    ),
  )

  const byId = new Map()
  for (const batch of searches) {
    for (const video of batch) {
      if (!byId.has(video.videoId)) byId.set(video.videoId, video)
    }
  }

  const ranked = [...byId.values()].sort((a, b) => {
    const scoreDiff = scorePlaylistVideo(b, plan) - scorePlaylistVideo(a, plan)
    if (scoreDiff !== 0) return scoreDiff
    return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
  })

  const videos = ranked.slice(0, plan.count)
  if (videos.length === 0) throw new Error('No videos found for this playlist')

  return {
    title: plan.title,
    topic: plan.topic,
    language: plan.language,
    source: plan.source,
    videos,
  }
}

async function fetchYouTubeVideoDetails(videoId, apiKey) {
  const api = new URL('https://www.googleapis.com/youtube/v3/videos')
  api.searchParams.set('part', 'snippet')
  api.searchParams.set('id', videoId)
  api.searchParams.set('key', apiKey)

  const response = await fetch(api)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Could not load video details')
  }

  const item = data.items?.[0]
  if (!item?.snippet) throw new Error('Video nicht gefunden')

  const description = item.snippet.description ?? ''
  return {
    videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    description,
    chapters: parseDescriptionChapters(description),
  }
}

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const json = (data, status = 200) => jsonResponse(data, status, request)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    })
  }

  const gate = createUsageGate(env, env.USAGE_KV ?? null)

  if (url.pathname === '/api/billing/status' && request.method === 'GET') {
    try {
      const status = await gate.getBillingStatus(request.headers)
      return json(status)
    } catch (err) {
      return json({ error: err.message || 'Could not load billing status' }, 500)
    }
  }

  if (url.pathname === '/api/billing/validate' && request.method === 'POST') {
    try {
      const body = await request.json()
      const input = validateLicenseKeyInput(body.key, request.headers)
      if (!input.ok) {
        return json(input.body, input.status)
      }
      const result = await validateLicenseKey(input.key, env, gate.store)
      return json({
        valid: result.valid,
        tier: result.tier,
        benefitId: result.benefitId,
      })
    } catch (err) {
      return json({ error: err.message || 'Validation failed', valid: false }, 500)
    }
  }

  if (url.pathname === '/api/polar/webhook' && request.method === 'POST') {
    try {
      const rawBody = await request.text()
      const result = await handlePolarWebhook(rawBody, request.headers, env, gate.store)
      return json(result.body, result.status)
    } catch (err) {
      return json({ error: err.message || 'Webhook failed' }, 500)
    }
  }

  if (url.pathname === '/api/playlist/generate' && request.method === 'POST') {
    const check = await gate.checkAction(request.headers, 'playlist')
    if (!check.allowed) return json(check.body, check.status)

    const key = env.YOUTUBE_API_KEY?.trim()
    if (!key) {
      return json(
        { error: 'YOUTUBE_API_KEY not configured. Set it as a Cloudflare Pages secret.' },
        500,
      )
    }

    try {
      const body = await request.json()
      const prompt = body.prompt?.trim()
      const maxResults = Math.min(Number(body.maxResults) || 8, 12)
      if (!prompt) return json({ error: 'Prompt required' }, 400)

      const result = await generatePlaylistFromPrompt(prompt, key, env, maxResults)
      await gate.incrementAction(check.ctx, 'playlist')
      return json(result)
    } catch (err) {
      return json({ error: err.message || 'Could not create playlist' }, 502)
    }
  }

  // /api/youtube/transcript/:videoId/confirm (POST — before GET-only guard)
  const transcriptConfirmMatch = url.pathname.match(
    /^\/api\/youtube\/transcript\/([a-zA-Z0-9_-]{11})\/confirm$/,
  )
  if (transcriptConfirmMatch && request.method === 'POST') {
    const check = await gate.checkAction(request.headers, 'transcript')
    if (!check.allowed) return json(check.body, check.status)

    await gate.incrementAction(check.ctx, 'transcript')
    return json({ ok: true })
  }

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // /api/youtube/search
  if (url.pathname === '/api/youtube/search') {
    const check = await gate.checkAction(request.headers, 'search')
    if (!check.allowed) return json(check.body, check.status)

    const q = url.searchParams.get('q')?.trim()
    const maxResults = Math.min(Number(url.searchParams.get('maxResults')) || 12, 25)
    const key = env.YOUTUBE_API_KEY?.trim()

    if (!key) {
      return json(
        {
          error:
            'YOUTUBE_API_KEY not configured. Set it as a Cloudflare Pages secret.',
        },
        500,
      )
    }

    if (!q) return json({ error: 'Query required' }, 400)

    try {
      const api = new URL('https://www.googleapis.com/youtube/v3/search')
      api.searchParams.set('part', 'snippet')
      api.searchParams.set('q', q)
      api.searchParams.set('type', 'video')
      api.searchParams.set('maxResults', String(maxResults))
      api.searchParams.set('key', key)

      const response = await fetch(api)
      const data = await response.json()

      if (!response.ok) {
        return json(
          { error: data.error?.message || 'YouTube search failed' },
          response.status,
        )
      }

      const results = (data.items ?? [])
        .filter((item) => item.id?.videoId)
        .map((item) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnailUrl:
            item.snippet.thumbnails?.medium?.url ??
            item.snippet.thumbnails?.default?.url,
          publishedAt: item.snippet.publishedAt,
        }))

      await gate.incrementAction(check.ctx, 'search')
      return json({ results })
    } catch {
      return json({ error: 'Search request failed' }, 500)
    }
  }

  const transcriptMatch = url.pathname.match(
    /^\/api\/youtube\/transcript\/([a-zA-Z0-9_-]{11})$/,
  )
  if (transcriptMatch) {
    const check = await gate.checkAction(request.headers, 'transcript')
    if (!check.allowed) return json(check.body, check.status)

    try {
      const segments = await fetchTranscriptSegments(transcriptMatch[1], env, fetch)
      await gate.incrementAction(check.ctx, 'transcript')
      return json({ segments })
    } catch (err) {
      return json({ error: err.message || 'No captions for this video' }, 404)
    }
  }

  const videoMatch = url.pathname.match(/^\/api\/youtube\/video\/([a-zA-Z0-9_-]{11})$/)
  if (videoMatch) {
    const videoId = videoMatch[1]
    const key = env.YOUTUBE_API_KEY?.trim()
    if (!key) {
      return json(
        { error: 'YOUTUBE_API_KEY not configured. Set it as a Cloudflare Pages secret.' },
        500,
      )
    }

    try {
      const details = await fetchYouTubeVideoDetails(videoId, key)
      return json(details)
    } catch (err) {
      return json(
        { error: err.message || 'Could not load video details' },
        404,
      )
    }
  }

  if (url.pathname === '/api/health') {
    return json({ ok: true })
  }

  return json({ error: 'Not found' }, 404)
}

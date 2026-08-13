import { searchYouTubeVideos } from './youtubeSearch.js'

function scoreVideo(video, plan) {
  let score = 0
  const title = (video.title ?? '').toLowerCase()
  const topic = (plan.topic ?? '').toLowerCase()

  if (topic && title.includes(topic)) score += 12
  if (/tutorial|kurs|course|lernen|learn|anfänger|beginner|crash/i.test(title)) score += 4
  if (plan.language === 'de' && /deutsch|german|\bde\b/i.test(title)) score += 3
  if (/shorts/i.test(title)) score -= 4

  return score
}

function rankVideos(videos, plan) {
  return [...videos].sort((a, b) => {
    const scoreDiff = scoreVideo(b, plan) - scoreVideo(a, plan)
    if (scoreDiff !== 0) return scoreDiff
    return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
  })
}

export async function searchPlaylistVideos(plan, apiKey) {
  const perQuery = Math.min(Math.ceil((plan.count * 1.5) / plan.queries.length), 12)
  const searches = await Promise.all(
    plan.queries.map((query) =>
      searchYouTubeVideos(query, apiKey, perQuery).catch((err) => {
        console.warn(`[playlistSearch] query failed "${query}":`, err.message)
        return []
      }),
    ),
  )

  const byId = new Map()
  for (const batch of searches) {
    for (const video of batch) {
      if (!byId.has(video.videoId)) byId.set(video.videoId, video)
    }
  }

  const ranked = rankVideos([...byId.values()], plan)
  const videos = ranked.slice(0, plan.count)

  if (videos.length === 0) {
    throw new Error('No videos found for this playlist')
  }

  return videos
}

export async function generatePlaylistFromPrompt(prompt, apiKey, options = {}) {
  const { parsePlaylistIntent } = await import('./playlistIntent.js')
  const { ai = null, maxResults = 8 } = options

  const plan = await parsePlaylistIntent(prompt, { ai, maxResults })
  const videos = await searchPlaylistVideos(plan, apiKey)

  return {
    title: plan.title,
    topic: plan.topic,
    language: plan.language,
    source: plan.source,
    videos,
  }
}

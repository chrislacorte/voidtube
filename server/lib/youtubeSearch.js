export async function searchYouTubeVideos(query, apiKey, maxResults = 12) {
  const q = query?.trim()
  const limit = Math.min(Number(maxResults) || 12, 25)

  if (!apiKey?.trim()) {
    throw new Error(
      'YOUTUBE_API_KEY not configured. Add it to .env and restart npm run dev.',
    )
  }

  if (!q) {
    throw new Error('Search query missing')
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('q', q)
  url.searchParams.set('type', 'video')
  url.searchParams.set('maxResults', String(limit))
  url.searchParams.set('key', apiKey.trim())

  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || 'YouTube search failed')
  }

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

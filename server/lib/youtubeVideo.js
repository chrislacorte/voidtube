import { parseDescriptionChapters } from './youtubeDescriptionChapters.js'

export async function fetchYouTubeVideoDetails(videoId, apiKey) {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new Error('Invalid video ID')
  }

  if (!apiKey?.trim()) {
    throw new Error(
      'YOUTUBE_API_KEY not configured. Add it to .env and restart npm run dev.',
    )
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('id', videoId)
  url.searchParams.set('key', apiKey.trim())

  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || 'Could not load video details')
  }

  const item = data.items?.[0]
  if (!item?.snippet) {
    throw new Error('Video nicht gefunden')
  }

  const { snippet } = item
  const description = snippet.description ?? ''
  const chapters = parseDescriptionChapters(description)

  return {
    videoId,
    title: snippet.title,
    channelTitle: snippet.channelTitle,
    description,
    chapters,
  }
}

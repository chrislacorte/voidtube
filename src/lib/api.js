import { getDeviceId } from './deviceId'
import { getStoredLicenseKey } from './license'
import { fetchTranscriptWithLangFallback } from './youtubeTranscriptAiClient'

export class LimitExceededError extends Error {
  constructor(payload) {
    super(payload?.error || 'Usage limit reached')
    this.name = 'LimitExceededError'
    this.code = 'LIMIT_EXCEEDED'
    this.payload = payload
  }
}

export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

function billingHeaders(extra = {}) {
  const headers = {
    ...extra,
    'X-VoidTube-Device-Id': getDeviceId(),
  }

  const licenseKey = getStoredLicenseKey()
  if (licenseKey) {
    headers['X-VoidTube-License-Key'] = licenseKey
  }

  return headers
}

const API_CODE_MESSAGES = {
  INVALID_DEVICE: 'Invalid device ID — reload the page to reset.',
  LIMIT_EXCEEDED: 'Monthly usage limit reached',
}

async function parseApiError(response, fallback) {
  let data = null
  try {
    data = await response.json()
  } catch {
    // non-JSON error body
  }

  if (data) {
    if (response.status === 402 && data.code === 'LIMIT_EXCEEDED') {
      throw new LimitExceededError(data)
    }
    if (data.error) return data.error
    if (data.code && API_CODE_MESSAGES[data.code]) return API_CODE_MESSAGES[data.code]
    if (data.code) return data.code
  }

  if (response.status === 400) return 'Bad request'
  if (response.status === 402) return API_CODE_MESSAGES.LIMIT_EXCEEDED
  if (response.status === 404) return 'No captions for this video'
  if (response.status === 429) return 'Too many requests — try again later'
  if (response.status === 502 || response.status === 503) {
    return 'API unavailable. Start the project with npm run dev.'
  }
  if (response.status >= 500) return 'Server error — try again later'

  return fallback
}

async function meteredFetch(url, options = {}) {
  const headers = billingHeaders(options.headers ?? {})

  let response
  try {
    response = await fetch(url, { ...options, headers })
  } catch {
    throw new Error('Network error — is npm run dev running?')
  }

  if (!response.ok) {
    const message = await parseApiError(response, 'Request failed')
    if (message instanceof LimitExceededError) throw message
    throw new Error(message)
  }

  return response
}

export async function fetchBillingStatus() {
  let response
  try {
    response = await fetch('/api/billing/status', {
      headers: billingHeaders(),
    })
  } catch {
    throw new Error('Could not load billing status')
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Could not load billing status'))
  }

  return response.json()
}

export async function searchYouTube(query, maxResults = 12) {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) })
  const response = await meteredFetch(`/api/youtube/search?${params}`)

  const data = await response.json()
  return data.results ?? []
}

export async function fetchTranscript(videoId) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(`/api/youtube/transcript/${videoId}`, {
      headers: billingHeaders(),
      signal: controller.signal,
    })

    if (!response.ok) {
      const message = await parseApiError(response, 'Request failed')
      if (message instanceof LimitExceededError) throw message
      throw new Error(message)
    }

    const data = await response.json()
    return data.segments ?? []
  } catch (err) {
    if (err instanceof LimitExceededError) throw err
    // Fallback: browser → youtube-transcript.ai, billing confirm on voidtube.pages.dev
    const segments = await fetchTranscriptWithLangFallback(videoId)
    await fetch(`/api/youtube/transcript/${videoId}/confirm`, {
      method: 'POST',
      headers: billingHeaders(),
    })
    return segments
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchVideoChapters(videoId) {
  let response
  try {
    response = await fetch(`/api/youtube/video/${videoId}`, {
      headers: billingHeaders(),
    })
  } catch {
    throw new Error('Network error — YouTube API unavailable.')
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Could not load chapters'))
  }

  const data = await response.json()
  return {
    description: data.description ?? '',
    chapters: data.chapters ?? [],
  }
}

export async function generatePlaylist(prompt, maxResults = 8) {
  const response = await meteredFetch('/api/playlist/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maxResults }),
  })

  return response.json()
}

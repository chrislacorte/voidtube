import { Router } from 'express'
import { searchYouTubeVideos } from '../lib/youtubeSearch.js'
import { fetchTranscriptSegments } from '../lib/youtubeTranscript.js'
import { fetchYouTubeVideoDetails } from '../lib/youtubeVideo.js'
import { billingGate } from './billing.js'
import {
  createUsageGateMiddleware,
  finishUsageGate,
} from '../middleware/usageGateMiddleware.js'

const router = Router()
const usageGate = createUsageGateMiddleware(billingGate)

router.get('/search', usageGate('search'), async (req, res) => {
  const q = req.query.q?.trim()
  const maxResults = Math.min(Number(req.query.maxResults) || 12, 25)
  const key = process.env.YOUTUBE_API_KEY?.trim()

  if (!key) {
    return res.status(500).json({
      error:
        'YOUTUBE_API_KEY not configured. Add it to .env in the project root and restart with npm run dev.',
    })
  }

  if (!q) {
    return res.status(400).json({ error: 'Query required' })
  }

  try {
    const results = await searchYouTubeVideos(q, key, maxResults)
    await finishUsageGate(req)
    res.json({ results })
  } catch (err) {
    console.error('Search error:', err)
    res.status(502).json({ error: err.message || 'Search request failed' })
  }
})

/** Transcript via youtube-transcript.ai (server proxy → voidtube.pages.dev URL) */
router.get('/transcript/:videoId', usageGate('transcript'), async (req, res) => {
  const { videoId } = req.params

  try {
    const segments = await fetchTranscriptSegments(videoId, process.env)
    await finishUsageGate(req)
    res.json({ segments })
  } catch (err) {
    console.error('Transcript error:', err)
    res.status(404).json({ error: err.message || 'No captions for this video' })
  }
})

/** Billing confirm after browser fallback fetched transcript from youtube-transcript.ai */
router.post('/transcript/:videoId/confirm', usageGate('transcript'), async (req, res) => {
  try {
    await finishUsageGate(req)
    res.json({ ok: true })
  } catch (err) {
    console.error('Transcript confirm error:', err)
    res.status(500).json({ error: err.message || 'Could not confirm transcript usage' })
  }
})

router.get('/video/:videoId', async (req, res) => {
  const { videoId } = req.params
  const key = process.env.YOUTUBE_API_KEY?.trim()

  if (!key) {
    return res.status(500).json({
      error:
        'YOUTUBE_API_KEY not configured. Add it to .env in the project root and restart with npm run dev.',
    })
  }

  try {
    const details = await fetchYouTubeVideoDetails(videoId, key)
    res.json(details)
  } catch (err) {
    console.error('Video details error:', err)
    res.status(404).json({ error: err.message || 'Could not load video details' })
  }
})

export default router

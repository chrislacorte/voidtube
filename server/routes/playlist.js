import { Router } from 'express'
import { generatePlaylistFromPrompt } from '../lib/playlistSearch.js'
import { billingGate } from './billing.js'
import {
  createUsageGateMiddleware,
  finishUsageGate,
} from '../middleware/usageGateMiddleware.js'

const router = Router()
const usageGate = createUsageGateMiddleware(billingGate)

router.post('/generate', usageGate('playlist'), async (req, res) => {
  const prompt = req.body?.prompt?.trim()
  const maxResults = Math.min(Number(req.body?.maxResults) || 8, 12)
  const key = process.env.YOUTUBE_API_KEY?.trim()

  if (!key) {
    return res.status(500).json({
      error:
        'YOUTUBE_API_KEY not configured. Add it to .env in the project root and restart with npm run dev.',
    })
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' })
  }

  try {
    const result = await generatePlaylistFromPrompt(prompt, key, { maxResults })
    await finishUsageGate(req)
    res.json(result)
  } catch (err) {
    console.error('Playlist generate error:', err)
    res.status(502).json({ error: err.message || 'Could not create playlist' })
  }
})

export default router

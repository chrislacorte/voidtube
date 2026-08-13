import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import playlistRoutes from './routes/playlist.js'
import youtubeRoutes from './routes/youtube.js'
import billingRoutes, { billingGate } from './routes/billing.js'
import { handlePolarWebhook } from './lib/polarWebhook.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')

dotenv.config({ path: envPath })

const app = express()
const PORT = process.env.PORT || 3001

app.post(
  '/api/polar/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const rawBody = req.body?.toString?.('utf8') ?? ''
      const result = await handlePolarWebhook(rawBody, req.headers, process.env, billingGate.store)
      res.status(result.status).json(result.body)
    } catch (err) {
      console.error('Polar webhook error:', err)
      res.status(500).json({ error: err.message || 'Webhook failed' })
    }
  },
)

app.use(cors())
app.use(express.json())
app.use('/api/youtube', youtubeRoutes)
app.use('/api/playlist', playlistRoutes)
app.use('/api/billing', billingRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  const hasYouTubeKey = Boolean(process.env.YOUTUBE_API_KEY?.trim())
  console.log(`VoidTube API running on http://localhost:${PORT}`)
  console.log(`Env file: ${envPath}`)
  console.log(`YouTube API key: ${hasYouTubeKey ? 'configured' : 'MISSING — check .env'}`)
})

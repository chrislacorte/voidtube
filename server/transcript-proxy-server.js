/**
 * Standalone transcript relay for production.
 * Deploy on Railway, Render, Fly.io, or a home server — NOT on Cloudflare.
 *
 * Usage:
 *   TRANSCRIPT_PROXY_SECRET=your-secret npm run transcript-proxy
 *
 * Then set on Cloudflare Pages:
 *   TRANSCRIPT_PROXY_URL=https://your-relay.example.com
 *   TRANSCRIPT_PROXY_SECRET=your-secret
 */
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchTranscriptSegments } from './lib/youtubeTranscript.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()
const PORT = Number(process.env.TRANSCRIPT_PROXY_PORT) || 8788
const HOST = process.env.TRANSCRIPT_PROXY_HOST || '0.0.0.0'
const SECRET = process.env.TRANSCRIPT_PROXY_SECRET?.trim()

/** Relay must fetch directly — never call itself via TRANSCRIPT_PROXY_URL */
function relayEnv() {
  const env = { ...process.env }
  delete env.TRANSCRIPT_PROXY_URL
  return env
}

app.use(cors())
app.use(express.json())

function requireAuth(req, res, next) {
  if (!SECRET) return next()
  const auth = req.headers.authorization || ''
  if (auth === `Bearer ${SECRET}`) return next()
  return res.status(401).json({ error: 'Unauthorized' })
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'voidtube-transcript-proxy' })
})

app.get('/transcript/:videoId', requireAuth, async (req, res) => {
  const { videoId } = req.params
  try {
    const segments = await fetchTranscriptSegments(videoId, relayEnv())
    res.json({ segments })
  } catch (err) {
    res.status(404).json({ error: err.message || 'No captions for this video' })
  }
})

app.listen(PORT, HOST, () => {
  console.log(`VoidTube transcript proxy on http://${HOST}:${PORT}`)
  console.log(`Auth: ${SECRET ? 'Bearer token required' : 'OPEN — set TRANSCRIPT_PROXY_SECRET'}`)
})

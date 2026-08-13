import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { searchYouTubeVideos } from './server/lib/youtubeSearch.js'
import { fetchTranscriptSegments } from './server/lib/youtubeTranscript.js'
import { fetchYouTubeVideoDetails } from './server/lib/youtubeVideo.js'
import { generatePlaylistFromPrompt } from './server/lib/playlistSearch.js'
import { createUsageGate } from './server/lib/usageGate.js'
import { handlePolarWebhook } from './server/lib/polarWebhook.js'
import { validateLicenseKey } from './server/lib/polarValidate.js'
import { validateLicenseKeyInput } from './server/lib/billingValidate.js'
import { applyCorsToVite } from './server/lib/apiCors.js'

function sendJson(res, req, data, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  applyCorsToVite(res, req)
  res.end(JSON.stringify(data))
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function voidTubeApiPlugin() {
  return {
    name: 'voidtube-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      const apiKey = env.YOUTUBE_API_KEY
      const gate = createUsageGate(env)

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const url = new URL(req.url, 'http://localhost')

        if (req.method === 'OPTIONS') {
          applyCorsToVite(res, req)
          res.statusCode = 204
          res.end()
          return
        }

        if (url.pathname === '/api/health') {
          sendJson(res, req, { ok: true })
          return
        }

        if (url.pathname === '/api/billing/status' && req.method === 'GET') {
          try {
            const status = await gate.getBillingStatus(req.headers)
            sendJson(res, req, status)
          } catch (err) {
            sendJson(res, req, { error: err.message || 'Could not load billing status' }, 500)
          }
          return
        }

        if (url.pathname === '/api/billing/validate' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req)
            const input = validateLicenseKeyInput(body.key, req.headers)
            if (!input.ok) {
              sendJson(res, req, input.body, input.status)
              return
            }
            const result = await validateLicenseKey(input.key, env, gate.store)
            sendJson(res, req, {
              valid: result.valid,
              tier: result.tier,
              benefitId: result.benefitId,
            })
          } catch (err) {
            sendJson(res, req, { error: err.message || 'Validation failed', valid: false }, 500)
          }
          return
        }

        if (url.pathname === '/api/polar/webhook' && req.method === 'POST') {
          try {
            const rawBody = await readRawBody(req)
            const result = await handlePolarWebhook(rawBody, req.headers, env, gate.store)
            sendJson(res, req, result.body, result.status)
          } catch (err) {
            sendJson(res, req, { error: err.message || 'Webhook failed' }, 500)
          }
          return
        }

        if (url.pathname === '/api/youtube/search' && req.method === 'GET') {
          const check = await gate.checkAction(req.headers, 'search')
          if (!check.allowed) {
            sendJson(res, req, check.body, check.status)
            return
          }

          try {
            const results = await searchYouTubeVideos(
              url.searchParams.get('q'),
              apiKey,
              url.searchParams.get('maxResults'),
            )
            await gate.incrementAction(check.ctx, 'search')
            sendJson(res, req, { results })
          } catch (err) {
            const message = err.message || 'Search request failed'
            const status = message.includes('not configured') ? 500 : 502
            sendJson(res, req, { error: message }, status)
          }
          return
        }

        const transcriptConfirmMatch = url.pathname.match(
          /^\/api\/youtube\/transcript\/([a-zA-Z0-9_-]{11})\/confirm$/,
        )
        if (transcriptConfirmMatch && req.method === 'POST') {
          const check = await gate.checkAction(req.headers, 'transcript')
          if (!check.allowed) {
            sendJson(res, req, check.body, check.status)
            return
          }

          await gate.incrementAction(check.ctx, 'transcript')
          sendJson(res, req, { ok: true })
          return
        }

        const transcriptMatch = url.pathname.match(
          /^\/api\/youtube\/transcript\/([a-zA-Z0-9_-]{11})$/,
        )
        if (transcriptMatch && req.method === 'GET') {
          const check = await gate.checkAction(req.headers, 'transcript')
          if (!check.allowed) {
            sendJson(res, req, check.body, check.status)
            return
          }

          try {
            const segments = await fetchTranscriptSegments(transcriptMatch[1], env)
            await gate.incrementAction(check.ctx, 'transcript')
            sendJson(res, req, { segments })
          } catch (err) {
            sendJson(res, req, { error: err.message || 'No captions for this video' }, 404)
          }
          return
        }

        const videoMatch = url.pathname.match(/^\/api\/youtube\/video\/([a-zA-Z0-9_-]{11})$/)
        if (videoMatch && req.method === 'GET') {
          try {
            const details = await fetchYouTubeVideoDetails(videoMatch[1], apiKey)
            sendJson(res, req, details)
          } catch (err) {
            const message = err.message || 'Could not load video details'
            const status = message.includes('not configured') ? 500 : 404
            sendJson(res, req, { error: message }, status)
          }
          return
        }

        if (url.pathname === '/api/playlist/generate' && req.method === 'POST') {
          const check = await gate.checkAction(req.headers, 'playlist')
          if (!check.allowed) {
            sendJson(res, req, check.body, check.status)
            return
          }

          try {
            const body = await readJsonBody(req)
            const prompt = body.prompt?.trim()
            const maxResults = Math.min(Number(body.maxResults) || 8, 12)

            if (!prompt) {
              sendJson(res, req, { error: 'Prompt required' }, 400)
              return
            }

            const result = await generatePlaylistFromPrompt(prompt, apiKey, { maxResults })
            await gate.incrementAction(check.ctx, 'playlist')
            sendJson(res, req, result)
          } catch (err) {
            const message = err.message || 'Could not create playlist'
            const status = message.includes('not configured') ? 500 : 502
            sendJson(res, req, { error: message }, status)
          }
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), voidTubeApiPlugin()],
})

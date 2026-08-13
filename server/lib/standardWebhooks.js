/**
 * Standard Webhooks signature verification (Polar.sh).
 * @see https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md
 */

const REPLAY_TOLERANCE_SEC = 300

function readHeader(headers, name) {
  if (headers instanceof Headers) return headers.get(name)
  if (typeof headers.get === 'function') return headers.get(name)
  const lower = name.toLowerCase()
  return headers[name] ?? headers[lower] ?? null
}

function decodeSecretToBytes(secret) {
  let normalized = secret.trim()
  if (normalized.startsWith('whsec_')) {
    normalized = normalized.slice(6)
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(normalized, 'base64')
  }

  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function timingSafeEqualString(a, b) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

async function computeSignature(secret, signedContent) {
  const keyBytes = decodeSecretToBytes(secret)
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(signedContent))
  return bytesToBase64(new Uint8Array(signature))
}

/**
 * @param {string} rawBody
 * @param {Headers|Record<string,string>} headers
 * @param {string} secret - base64-encoded Polar webhook secret
 */
export async function verifyStandardWebhook(rawBody, headers, secret) {
  if (!secret?.trim()) return false

  const webhookId = readHeader(headers, 'webhook-id')
  const webhookTimestamp = readHeader(headers, 'webhook-timestamp')
  const webhookSignature = readHeader(headers, 'webhook-signature')

  if (!webhookId || !webhookTimestamp || !webhookSignature) return false

  const timestamp = Number.parseInt(webhookTimestamp, 10)
  if (!Number.isFinite(timestamp)) return false

  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - timestamp) > REPLAY_TOLERANCE_SEC) return false

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`
  let expected
  try {
    expected = await computeSignature(secret, signedContent)
  } catch {
    return false
  }

  for (const entry of webhookSignature.split(/\s+/)) {
    const comma = entry.indexOf(',')
    if (comma === -1) continue
    const version = entry.slice(0, comma)
    const value = entry.slice(comma + 1)
    if (version === 'v1' && timingSafeEqualString(value, expected)) {
      return true
    }
  }

  return false
}

export function requireWebhookSecret(env) {
  const secret = env.POLAR_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return {
      ok: false,
      status: 503,
      body: { error: 'Webhook secret not configured' },
    }
  }
  return { ok: true, secret }
}

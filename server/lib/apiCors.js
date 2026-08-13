const ALLOWED_ORIGINS = new Set([
  'https://voidtube.pages.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

const LOCALHOST_DEV_ORIGIN =
  /^http:\/\/(localhost|127\.0\.0\.1):517[3-9]$/

const PAGES_PREVIEW_ORIGIN =
  /^https:\/\/[a-z0-9-]+\.voidtube\.pages\.dev$/i

export function isAllowedOrigin(origin) {
  if (!origin) return false
  if (ALLOWED_ORIGINS.has(origin)) return true
  if (LOCALHOST_DEV_ORIGIN.test(origin)) return true
  if (PAGES_PREVIEW_ORIGIN.test(origin)) return true
  return false
}

export function resolveCorsOrigin(requestOrHeaders) {
  const get =
    requestOrHeaders instanceof Request
      ? (name) => requestOrHeaders.headers.get(name)
      : typeof requestOrHeaders?.get === 'function'
        ? (name) => requestOrHeaders.get(name)
        : (name) => requestOrHeaders?.[name] ?? requestOrHeaders?.[name.toLowerCase()] ?? null

  const origin = get('Origin') ?? get('origin')
  if (origin && isAllowedOrigin(origin)) return origin
  return null
}

export function corsHeaders(requestOrHeaders, extra = {}) {
  const origin = resolveCorsOrigin(requestOrHeaders)
  const headers = {
    ...extra,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers':
      'Content-Type, X-VoidTube-Device-Id, X-VoidTube-License-Key',
  }

  if (origin) {
    headers['access-control-allow-origin'] = origin
    headers['vary'] = 'Origin'
  }

  return headers
}

export function jsonResponse(data, status, requestOrHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(requestOrHeaders),
    },
  })
}

export function applyCorsToVite(res, req, extra = {}) {
  const origin = resolveCorsOrigin(req.headers)
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-VoidTube-Device-Id, X-VoidTube-License-Key',
  )
  for (const [key, value] of Object.entries(extra)) {
    res.setHeader(key, value)
  }
}

export { ALLOWED_ORIGINS }

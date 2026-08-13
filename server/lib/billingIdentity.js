const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidDeviceId(deviceId) {
  return typeof deviceId === 'string' && UUID_RE.test(deviceId.trim())
}

export function normalizeLicenseKey(key) {
  return typeof key === 'string' ? key.trim() : ''
}

export async function hashLicenseKey(key) {
  const normalized = normalizeLicenseKey(key)
  if (!normalized) return null

  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(normalized)
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(normalized).digest('hex')
}

export async function resolveIdentity(deviceId, licenseKey) {
  const key = normalizeLicenseKey(licenseKey)
  if (key) {
    const hash = await hashLicenseKey(key)
    return { identity: `license:${hash}`, licenseKey: key }
  }

  const id = deviceId?.trim()
  if (!isValidDeviceId(id)) {
    throw new Error('Invalid or missing device ID')
  }

  return { identity: `device:${id}`, licenseKey: null }
}

export function readBillingHeaders(headers) {
  const get = (name) => {
    if (headers instanceof Headers) return headers.get(name)
    if (typeof headers.get === 'function') return headers.get(name)
    const lower = name.toLowerCase()
    return headers[name] ?? headers[lower] ?? null
  }

  return {
    deviceId: get('X-VoidTube-Device-Id') ?? get('x-voidtube-device-id'),
    licenseKey: get('X-VoidTube-License-Key') ?? get('x-voidtube-license-key'),
  }
}

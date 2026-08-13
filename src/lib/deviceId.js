const STORAGE_KEY = 'voidtube-device-id'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidDeviceId(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim())
}

function generateUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function persistDeviceId(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignore storage errors
  }
}

export function getDeviceId() {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing && isValidDeviceId(existing)) {
      return existing.trim()
    }

    const id = generateUuid()
    persistDeviceId(id)
    return id
  } catch {
    return generateUuid()
  }
}

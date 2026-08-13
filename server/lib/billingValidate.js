import { isValidDeviceId, readBillingHeaders } from './billingIdentity.js'

const MAX_LICENSE_KEY_LENGTH = 256

export function validateLicenseKeyInput(key, headers) {
  const trimmed = key?.trim()
  if (!trimmed) {
    return { ok: false, status: 400, body: { error: 'License key required', valid: false } }
  }

  if (trimmed.length > MAX_LICENSE_KEY_LENGTH) {
    return { ok: false, status: 400, body: { error: 'License key too long', valid: false } }
  }

  const { deviceId } = readBillingHeaders(headers)
  if (!isValidDeviceId(deviceId)) {
    return {
      ok: false,
      status: 400,
      body: { error: 'Invalid or missing device ID', code: 'INVALID_DEVICE', valid: false },
    }
  }

  return { ok: true, key: trimmed }
}

import { getDeviceId } from './deviceId'
import { getPolarConfig, getCheckoutUrls, tierFromBenefitId, tierLabel } from './polarConfig'

const STORAGE_KEY = 'voidtube-license-key'
const CACHE_KEY = 'voidtube-license-cache'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export const TIERS = {
  free: 'free',
  lifetime: 'lifetime',
  pro_monthly: 'pro_monthly',
}

export { getCheckoutUrls, tierLabel, tierFromBenefitId }

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...data, expiresAt: Date.now() + CACHE_TTL_MS }),
    )
  } catch {
    // ignore
  }
}

export function getStoredLicenseKey() {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || null
  } catch {
    return null
  }
}

export function setStoredLicenseKey(key) {
  const trimmed = key?.trim()
  if (!trimmed) {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(CACHE_KEY)
    return null
  }
  localStorage.setItem(STORAGE_KEY, trimmed)
  localStorage.removeItem(CACHE_KEY)
  return trimmed
}

export function clearLicenseKey() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(CACHE_KEY)
}

function billingHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'X-VoidTube-Device-Id': getDeviceId(),
  }
  const key = getStoredLicenseKey()
  if (key) headers['X-VoidTube-License-Key'] = key
  return headers
}

export async function validateLicenseKey(key = getStoredLicenseKey()) {
  const trimmed = key?.trim()
  if (!trimmed) {
    return { tier: TIERS.free, valid: false, key: null }
  }

  const cached = readCache()
  if (cached?.key === trimmed && cached.valid) {
    return cached
  }

  try {
    const response = await fetch('/api/billing/validate', {
      method: 'POST',
      headers: billingHeaders(),
      body: JSON.stringify({ key: trimmed }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok || !data.valid) {
      return { tier: TIERS.free, valid: false, key: trimmed, benefitId: data.benefitId }
    }

    const result = {
      tier: data.tier || TIERS.free,
      valid: data.valid,
      key: trimmed,
      benefitId: data.benefitId,
    }

    writeCache(result)
    return result
  } catch {
    const config = getPolarConfig()
    if (!config.organizationId) {
      return { tier: TIERS.free, valid: false, key: trimmed }
    }

    try {
      const response = await fetch(
        'https://api.polar.sh/v1/customer-portal/license-keys/validate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: trimmed,
            organization_id: config.organizationId,
          }),
        },
      )

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        return { tier: TIERS.free, valid: false, key: trimmed }
      }

      const benefitId =
        data.benefit_id ??
        data.benefit?.id ??
        data.license_key?.benefit_id ??
        data.license_key?.benefit?.id

      const status = data.status ?? data.license_key?.status
      const active = status === 'granted' || status === 'active' || data.valid === true
      const tier = active ? tierFromBenefitId(benefitId) : TIERS.free
      const result = {
        tier,
        valid: active && tier !== TIERS.free,
        key: trimmed,
        benefitId,
      }

      writeCache(result)
      return result
    } catch {
      return { tier: TIERS.free, valid: false, key: trimmed }
    }
  }
}

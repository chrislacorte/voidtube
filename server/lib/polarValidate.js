import { TIERS, tierFromBenefitId } from './usageTiers.js'
import { hashLicenseKey, normalizeLicenseKey } from './billingIdentity.js'

const VALIDATE_URL = 'https://api.polar.sh/v1/customer-portal/license-keys/validate'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const validateCache = new Map()

function cacheKey(orgId, keyHash) {
  return `${orgId}:${keyHash}`
}

function readCached(orgId, keyHash) {
  const entry = validateCache.get(cacheKey(orgId, keyHash))
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    validateCache.delete(cacheKey(orgId, keyHash))
    return null
  }
  return entry.tier
}

function writeCache(orgId, keyHash, tier) {
  validateCache.set(cacheKey(orgId, keyHash), {
    tier,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

export async function validateLicenseKey(licenseKey, env = {}, store = null) {
  const key = normalizeLicenseKey(licenseKey)
  if (!key) return { tier: TIERS.free, valid: false }

  const orgId = env.POLAR_ORGANIZATION_ID?.trim()
  if (!orgId) return { tier: TIERS.free, valid: false }

  const keyHash = await hashLicenseKey(key)
  const kvCacheKey = `license:${keyHash}`

  if (store) {
    try {
      const cached = await store.getMeta(kvCacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.expiresAt > Date.now()) {
          return { tier: parsed.tier, valid: parsed.valid, benefitId: parsed.benefitId }
        }
      }
    } catch {
      // ignore cache read errors
    }
  }

  const memCached = readCached(orgId, keyHash)
  if (memCached) return { tier: memCached, valid: memCached !== TIERS.free }

  try {
    const response = await fetch(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        organization_id: orgId,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return { tier: TIERS.free, valid: false }
    }

    const benefitId =
      data.benefit_id ??
      data.benefit?.id ??
      data.license_key?.benefit_id ??
      data.license_key?.benefit?.id

    const status = data.status ?? data.license_key?.status
    const active = status === 'granted' || status === 'active' || data.valid === true

    if (!active) {
      return { tier: TIERS.free, valid: false, benefitId }
    }

    const tier = tierFromBenefitId(benefitId, env)
    const result = { tier, valid: tier !== TIERS.free, benefitId }

    writeCache(orgId, keyHash, tier)

    if (store) {
      await store.setMeta(
        kvCacheKey,
        JSON.stringify({
          ...result,
          expiresAt: Date.now() + CACHE_TTL_MS,
        }),
      )
    }

    return result
  } catch {
    return { tier: TIERS.free, valid: false }
  }
}

export async function resolveTierFromRequest(headers, env, store) {
  const { readBillingHeaders } = await import('./billingIdentity.js')
  const { deviceId, licenseKey } = readBillingHeaders(headers)

  if (licenseKey) {
    const validation = await validateLicenseKey(licenseKey, env, store)
    if (validation.valid) {
      return { tier: validation.tier, deviceId, licenseKey }
    }
  }

  return { tier: TIERS.free, deviceId, licenseKey: null }
}

import { resolveIdentity, readBillingHeaders } from './billingIdentity.js'
import { validateLicenseKey } from './polarValidate.js'
import {
  USAGE_ACTIONS,
  TIERS,
  getLimitsForTier,
  getNextResetAt,
} from './usageTiers.js'
import { createUsageStore } from './usageStore.js'

export function createUsageGate(env = {}, kv = null) {
  const store = createUsageStore(kv)

  async function resolveContext(headers) {
    const { deviceId, licenseKey } = readBillingHeaders(headers)

    let tier = TIERS.free
    if (licenseKey) {
      const validation = await validateLicenseKey(licenseKey, env, store)
      if (validation.valid) tier = validation.tier
    }

    const identityInfo = await resolveIdentity(deviceId, licenseKey)
    const usage = await store.getUsage(identityInfo.identity)
    const limits = getLimitsForTier(tier)

    return {
      tier,
      identity: identityInfo.identity,
      deviceId: deviceId?.trim(),
      licenseKey: identityInfo.licenseKey,
      usage,
      limits,
      resetsAt: getNextResetAt(),
    }
  }

  async function checkAction(headers, action) {
    if (!USAGE_ACTIONS.includes(action)) {
      throw new Error(`Unknown usage action: ${action}`)
    }

    try {
      await resolveIdentity(readBillingHeaders(headers).deviceId, readBillingHeaders(headers).licenseKey)
    } catch (err) {
      return {
        allowed: false,
        status: 400,
        body: { error: err.message || 'Invalid device ID', code: 'INVALID_DEVICE' },
      }
    }

    const ctx = await resolveContext(headers)
    const current = ctx.usage[action] ?? 0
    const limit = ctx.limits[action] ?? 0

    if (current >= limit) {
      return {
        allowed: false,
        status: 402,
        body: {
          error: 'Usage limit reached',
          code: 'LIMIT_EXCEEDED',
          action,
          tier: ctx.tier,
          usage: { ...ctx.usage, [action]: current },
          limits: ctx.limits,
          limit,
          resetsAt: ctx.resetsAt,
        },
      }
    }

    return { allowed: true, ctx }
  }

  async function incrementAction(ctx, action) {
    const nextUsage = {
      ...ctx.usage,
      [action]: (ctx.usage[action] ?? 0) + 1,
    }
    await store.setUsage(ctx.identity, nextUsage)
    return nextUsage
  }

  async function getBillingStatus(headers) {
    try {
      const ctx = await resolveContext(headers)
      const { getLifetimeSlotStatus } = await import('./lifetimeSlots.js')
      const slots = await getLifetimeSlotStatus(store)

      return {
        tier: ctx.tier,
        usage: ctx.usage,
        limits: ctx.limits,
        resetsAt: ctx.resetsAt,
        ...slots,
      }
    } catch (err) {
      const { getLifetimeSlotStatus } = await import('./lifetimeSlots.js')
      const slots = await getLifetimeSlotStatus(store)
      return {
        tier: TIERS.free,
        usage: { search: 0, transcript: 0, playlist: 0 },
        limits: getLimitsForTier(TIERS.free),
        resetsAt: getNextResetAt(),
        error: err.message,
        ...slots,
      }
    }
  }

  return {
    store,
    resolveContext,
    checkAction,
    incrementAction,
    getBillingStatus,
  }
}

export async function withUsageGate(gate, headers, action, handler) {
  const check = await gate.checkAction(headers, action)
  if (!check.allowed) {
    return { ok: false, status: check.status, body: check.body }
  }

  try {
    const result = await handler()
    const usage = await gate.incrementAction(check.ctx, action)
    return { ok: true, result, usage }
  } catch (err) {
    return {
      ok: false,
      status: 502,
      body: { error: err.message || 'Request failed' },
    }
  }
}

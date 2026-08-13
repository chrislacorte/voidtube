import { incrementLifetimeSlotsSold } from './lifetimeSlots.js'
import { hashLicenseKey } from './billingIdentity.js'
import { TIERS, tierFromBenefitId } from './usageTiers.js'
import { requireWebhookSecret, verifyStandardWebhook } from './standardWebhooks.js'

function extractLicenseKey(payload) {
  return (
    payload.data?.license_key?.key ??
    payload.data?.license_key_key ??
    payload.data?.key ??
    payload.license_key?.key ??
    null
  )
}

function extractProductId(payload) {
  return (
    payload.data?.product_id ??
    payload.data?.product?.id ??
    payload.data?.order?.product_id ??
    null
  )
}

function extractBenefitId(payload) {
  return (
    payload.data?.benefit_id ??
    payload.data?.benefit?.id ??
    payload.data?.license_key?.benefit_id ??
    null
  )
}

async function processWebhookPayload(payload, env, store) {
  const eventType = payload.type ?? payload.event ?? ''
  const lifetimeProductId = env.POLAR_LIFETIME_PRODUCT_ID?.trim()
  const proProductId = env.POLAR_PRO_PRODUCT_ID?.trim()
  const productId = extractProductId(payload)
  const benefitId = extractBenefitId(payload)
  const licenseKey = extractLicenseKey(payload)

  if (eventType === 'order.created' || eventType === 'subscription.active') {
    let tier = tierFromBenefitId(benefitId, env)

    if (productId && lifetimeProductId && productId === lifetimeProductId) {
      tier = TIERS.lifetime
      const slotResult = await incrementLifetimeSlotsSold(store)
      if (!slotResult.ok) {
        console.warn('Lifetime slot cap reached — order may need manual review')
      }
    } else if (productId && proProductId && productId === proProductId) {
      tier = TIERS.pro_monthly
    }

    if (licenseKey && tier !== TIERS.free) {
      const hash = await hashLicenseKey(licenseKey)
      await store.setMeta(
        `license:${hash}`,
        JSON.stringify({
          tier,
          valid: true,
          benefitId,
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
        }),
      )
    }
  }

  if (eventType === 'subscription.canceled' || eventType === 'subscription.revoked') {
    if (licenseKey) {
      const hash = await hashLicenseKey(licenseKey)
      await store.setMeta(
        `license:${hash}`,
        JSON.stringify({
          tier: TIERS.free,
          valid: false,
          expiresAt: Date.now() + 60_000,
        }),
      )
    }
  }

  return { status: 200, body: { received: true } }
}

/**
 * @param {string} rawBody
 * @param {Headers|Record<string,string>} headers - Standard Webhooks headers
 */
export async function handlePolarWebhook(rawBody, headers, env, store) {
  const secretCheck = requireWebhookSecret(env)
  if (!secretCheck.ok) {
    return secretCheck
  }

  const valid = await verifyStandardWebhook(rawBody, headers, secretCheck.secret)
  if (!valid) {
    return { status: 401, body: { error: 'Invalid webhook signature' } }
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return { status: 400, body: { error: 'Invalid JSON' } }
  }

  return processWebhookPayload(payload, env, store)
}

/** @deprecated Use handlePolarWebhook — kept for import compatibility */
export async function handlePolarWebhookWorkers(rawBody, headers, env, store) {
  return handlePolarWebhook(rawBody, headers, env, store)
}

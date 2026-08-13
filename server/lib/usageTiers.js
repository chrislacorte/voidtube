export const USAGE_ACTIONS = ['search', 'transcript', 'playlist']

export const TIERS = {
  free: 'free',
  lifetime: 'lifetime',
  pro_monthly: 'pro_monthly',
}

/** Unlimited transcript cap for lifetime tier */
const UNLIMITED = 999_999

export const TIER_LIMITS = {
  [TIERS.free]: {
    search: 5,
    transcript: 5,
    playlist: 1,
  },
  [TIERS.lifetime]: {
    search: 100,
    transcript: UNLIMITED,
    playlist: 20,
  },
  [TIERS.pro_monthly]: {
    search: 100,
    transcript: 25,
    playlist: 10,
  },
}

export const LIFETIME_MAX_SLOTS = 10

export function getLimitsForTier(tier) {
  return TIER_LIMITS[tier] ?? TIER_LIMITS[TIERS.free]
}

export function getCurrentUsageMonth() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function getNextResetAt() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))
  return next.toISOString()
}

export function emptyUsage() {
  return { search: 0, transcript: 0, playlist: 0 }
}

export function tierFromBenefitId(benefitId, env = {}) {
  if (!benefitId) return TIERS.free
  const lifetimeId = env.POLAR_LIFETIME_BENEFIT_ID?.trim()
  const proId = env.POLAR_PRO_BENEFIT_ID?.trim()
  if (lifetimeId && benefitId === lifetimeId) return TIERS.lifetime
  if (proId && benefitId === proId) return TIERS.pro_monthly
  return TIERS.free
}

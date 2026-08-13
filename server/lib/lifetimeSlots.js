import { LIFETIME_MAX_SLOTS } from './usageTiers.js'

const META_KEY = 'meta:lifetime_slots_sold'

export async function getLifetimeSlotsSold(store) {
  const raw = await store.getMeta(META_KEY)
  const count = Number.parseInt(raw ?? '0', 10)
  return Number.isFinite(count) && count > 0 ? Math.min(count, LIFETIME_MAX_SLOTS) : 0
}

export async function getLifetimeSlotStatus(store) {
  const sold = await getLifetimeSlotsSold(store)
  const remaining = Math.max(LIFETIME_MAX_SLOTS - sold, 0)
  return {
    lifetimeSlotsSold: sold,
    lifetimeSlotsRemaining: remaining,
    lifetimeSoldOut: remaining <= 0,
    proAvailable: true,
  }
}

export async function incrementLifetimeSlotsSold(store) {
  const sold = await getLifetimeSlotsSold(store)
  if (sold >= LIFETIME_MAX_SLOTS) {
    return { ok: false, sold, remaining: 0 }
  }

  const next = sold + 1
  await store.setMeta(META_KEY, String(next))
  return {
    ok: true,
    sold: next,
    remaining: Math.max(LIFETIME_MAX_SLOTS - next, 0),
  }
}

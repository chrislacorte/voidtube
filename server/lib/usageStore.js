import { emptyUsage, getCurrentUsageMonth } from './usageTiers.js'

const memory = new Map()

function usageKey(identity, month = getCurrentUsageMonth()) {
  return `usage:${identity}:${month}`
}

function parseUsage(raw) {
  if (!raw) return emptyUsage()
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    return {
      search: Number(data.search) || 0,
      transcript: Number(data.transcript) || 0,
      playlist: Number(data.playlist) || 0,
    }
  } catch {
    return emptyUsage()
  }
}

export function createUsageStore(kv) {
  if (kv) {
    return {
      async getUsage(identity, month = getCurrentUsageMonth()) {
        const raw = await kv.get(usageKey(identity, month))
        return parseUsage(raw)
      },
      async setUsage(identity, usage, month = getCurrentUsageMonth()) {
        await kv.put(usageKey(identity, month), JSON.stringify(usage))
      },
      async getMeta(key) {
        return kv.get(key)
      },
      async setMeta(key, value) {
        await kv.put(key, value)
      },
    }
  }

  return {
    async getUsage(identity, month = getCurrentUsageMonth()) {
      const raw = memory.get(usageKey(identity, month))
      return parseUsage(raw)
    },
    async setUsage(identity, usage, month = getCurrentUsageMonth()) {
      memory.set(usageKey(identity, month), JSON.stringify(usage))
    },
    async getMeta(key) {
      return memory.get(key) ?? null
    },
    async setMeta(key, value) {
      memory.set(key, value)
    },
  }
}

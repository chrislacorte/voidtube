import { withUsageGate } from '../lib/usageGate.js'

export function createUsageGateMiddleware(gate) {
  return function usageGateMiddleware(action) {
    return async (req, res, next) => {
      const check = await gate.checkAction(req.headers, action)
      if (!check.allowed) {
        return res.status(check.status).json(check.body)
      }

      req.usageGate = {
        action,
        ctx: check.ctx,
        async increment() {
          return gate.incrementAction(check.ctx, action)
        },
      }

      next()
    }
  }
}

export async function finishUsageGate(req) {
  if (req.usageGate) {
    await req.usageGate.increment()
  }
}

export { withUsageGate }

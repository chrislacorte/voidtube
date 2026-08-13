import { Router } from 'express'
import { createUsageGate } from '../lib/usageGate.js'
import { validateLicenseKey } from '../lib/polarValidate.js'
import { validateLicenseKeyInput } from '../lib/billingValidate.js'

const router = Router()
const gate = createUsageGate(process.env)

router.get('/status', async (req, res) => {
  try {
    const status = await gate.getBillingStatus(req.headers)
    res.json(status)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not load billing status' })
  }
})

router.post('/validate', async (req, res) => {
  try {
    const input = validateLicenseKeyInput(req.body?.key, req.headers)
    if (!input.ok) {
      return res.status(input.status).json(input.body)
    }

    const result = await validateLicenseKey(input.key, process.env, gate.store)
    return res.json({
      valid: result.valid,
      tier: result.tier,
      benefitId: result.benefitId,
    })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Validation failed', valid: false })
  }
})

export default router
export { gate as billingGate }

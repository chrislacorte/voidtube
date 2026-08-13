import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { fetchBillingStatus } from '../lib/api'
import {
  clearLicenseKey,
  getStoredLicenseKey,
  setStoredLicenseKey,
  tierLabel,
  TIERS,
  validateLicenseKey,
} from '../lib/license'

const BillingContext = createContext(null)

export function BillingProvider({ children }) {
  const [tier, setTier] = useState(TIERS.free)
  const [usage, setUsage] = useState({ search: 0, transcript: 0, playlist: 0 })
  const [limits, setLimits] = useState({ search: 5, transcript: 5, playlist: 1 })
  const [resetsAt, setResetsAt] = useState(null)
  const [lifetimeSlotsRemaining, setLifetimeSlotsRemaining] = useState(10)
  const [lifetimeSoldOut, setLifetimeSoldOut] = useState(false)
  const [proAvailable] = useState(true)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState(null)
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshBilling = useCallback(async () => {
    setLoading(true)
    try {
      const validation = await validateLicenseKey()
      if (validation.valid) {
        setTier(validation.tier)
      } else if (!getStoredLicenseKey()) {
        setTier(TIERS.free)
      }

      const status = await fetchBillingStatus()
      if (status.tier) setTier(status.tier)
      if (status.usage) setUsage(status.usage)
      if (status.limits) setLimits(status.limits)
      if (status.resetsAt) setResetsAt(status.resetsAt)
      if (typeof status.lifetimeSlotsRemaining === 'number') {
        setLifetimeSlotsRemaining(status.lifetimeSlotsRemaining)
      }
      if (typeof status.lifetimeSoldOut === 'boolean') {
        setLifetimeSoldOut(status.lifetimeSoldOut)
      }
    } catch {
      // keep last known state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshBilling()
  }, [refreshBilling])

  const openUpgradeModal = useCallback((reason = null) => {
    setUpgradeReason(reason)
    setUpgradeOpen(true)
    refreshBilling()
  }, [refreshBilling])

  const closeUpgradeModal = useCallback(() => {
    setUpgradeOpen(false)
    setUpgradeReason(null)
  }, [])

  const openLicenseDialog = useCallback(() => {
    setLicenseDialogOpen(true)
  }, [])

  const closeLicenseDialog = useCallback(() => {
    setLicenseDialogOpen(false)
  }, [])

  const saveLicenseKey = useCallback(
    async (key) => {
      setStoredLicenseKey(key)
      const validation = await validateLicenseKey(key)
      setTier(validation.valid ? validation.tier : TIERS.free)
      await refreshBilling()
      return validation
    },
    [refreshBilling],
  )

  const removeLicenseKey = useCallback(async () => {
    clearLicenseKey()
    setTier(TIERS.free)
    await refreshBilling()
  }, [refreshBilling])

  const handleLimitExceeded = useCallback(
    (err) => {
      if (err?.code === 'LIMIT_EXCEEDED' || err?.name === 'LimitExceededError') {
        if (err.payload?.usage) setUsage(err.payload.usage)
        if (err.payload?.limits) setLimits(err.payload.limits)
        if (err.payload?.resetsAt) setResetsAt(err.payload.resetsAt)
        if (err.payload?.tier) setTier(err.payload.tier)
        openUpgradeModal(err.payload)
        return true
      }
      return false
    },
    [openUpgradeModal],
  )

  const value = useMemo(
    () => ({
      tier,
      tierLabel: tierLabel(tier),
      usage,
      limits,
      resetsAt,
      lifetimeSlotsRemaining,
      lifetimeSoldOut,
      proAvailable,
      loading,
      upgradeOpen,
      upgradeReason,
      licenseDialogOpen,
      refreshBilling,
      openUpgradeModal,
      closeUpgradeModal,
      openLicenseDialog,
      closeLicenseDialog,
      saveLicenseKey,
      removeLicenseKey,
      handleLimitExceeded,
    }),
    [
      tier,
      usage,
      limits,
      resetsAt,
      lifetimeSlotsRemaining,
      lifetimeSoldOut,
      proAvailable,
      loading,
      upgradeOpen,
      upgradeReason,
      licenseDialogOpen,
      refreshBilling,
      openUpgradeModal,
      closeUpgradeModal,
      openLicenseDialog,
      closeLicenseDialog,
      saveLicenseKey,
      removeLicenseKey,
      handleLimitExceeded,
    ],
  )

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
}

export function useBilling() {
  const ctx = useContext(BillingContext)
  if (!ctx) throw new Error('useBilling must be used within BillingProvider')
  return ctx
}

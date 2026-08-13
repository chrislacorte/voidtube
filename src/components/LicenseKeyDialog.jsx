import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, X } from 'lucide-react'
import { useBilling } from '../stores/BillingProvider'
import { getCheckoutUrls, getStoredLicenseKey, tierLabel } from '../lib/license'
import { Button } from './ui/button'
import { Input } from './ui/input'

export default function LicenseKeyDialog() {
  const {
    licenseDialogOpen,
    closeLicenseDialog,
    saveLicenseKey,
    removeLicenseKey,
    tier,
    refreshBilling,
    openUpgradeModal,
  } = useBilling()

  const checkout = getCheckoutUrls()
  const [key, setKey] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (licenseDialogOpen) {
      setKey(getStoredLicenseKey() || '')
      setError(null)
      setSuccess(null)
    }
  }, [licenseDialogOpen])

  if (!licenseDialogOpen) return null

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await saveLicenseKey(key)
      if (!result.valid) {
        setError('Invalid or inactive license key. Check the key from your Polar email.')
        return
      }
      setSuccess(`Activated ${tierLabel(result.tier)} plan`)
      await refreshBilling()
    } catch (err) {
      setError(err.message || 'Could not validate license key')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await removeLicenseKey()
      setKey('')
      setSuccess('License removed')
    } catch (err) {
      setError(err.message || 'Could not remove license')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="billing-modal-backdrop" role="presentation" onClick={closeLicenseDialog}>
      <div
        className="billing-modal billing-modal-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="license-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="billing-modal-close"
          onClick={closeLicenseDialog}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="license-dialog-title" className="billing-modal-title">
          Settings
        </h2>
        <p className="billing-modal-copy">
          No account needed. Paste the license key from your Polar purchase email. Current plan:{' '}
          {tierLabel(tier)}.
        </p>

        <label className="billing-field-label" htmlFor="license-key-input">
          License key
        </label>
        <Input
          id="license-key-input"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste your Polar license key"
          className="billing-license-input"
          autoComplete="off"
          spellCheck={false}
        />

        {error && <p className="billing-form-error">{error}</p>}
        {success && <p className="billing-form-success">{success}</p>}

        <div className="billing-license-actions">
          <Button onClick={handleSave} disabled={loading || !key.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activate license'}
          </Button>
          {getStoredLicenseKey() && (
            <Button variant="outline" onClick={handleRemove} disabled={loading}>
              Remove
            </Button>
          )}
        </div>

        <div className="billing-settings-divider" />

        <p className="billing-modal-copy billing-settings-buy-copy">
          Don&apos;t have a license yet?
        </p>
        <div className="billing-settings-buy-actions">
          {checkout.lifetime && (
            <a
              href={checkout.lifetime}
              target="_blank"
              rel="noopener noreferrer"
              className="billing-settings-buy-link"
            >
              Buy Lifetime
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {checkout.pro ? (
            <a
              href={checkout.pro}
              target="_blank"
              rel="noopener noreferrer"
              className="billing-settings-buy-link"
            >
              Buy Monthly Supporter
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <button
              type="button"
              className="billing-settings-buy-link billing-settings-buy-link-muted"
              onClick={() => {
                closeLicenseDialog()
                openUpgradeModal()
              }}
            >
              View purchase options
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

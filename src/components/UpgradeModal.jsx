import { useEffect, useState } from 'react'
import { ExternalLink, KeyRound, Sparkles, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { getCheckoutUrls, tierLabel, TIERS } from '../lib/license'
import { useBilling } from '../stores/BillingProvider'

const ACTION_LABELS = {
  search: 'searches',
  transcript: 'transcripts',
  playlist: 'playlists',
}

function formatResetDate(iso) {
  if (!iso) return 'the 1st of next month'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return 'the 1st of next month'
  }
}

export default function UpgradeModal() {
  const {
    upgradeOpen,
    upgradeReason,
    closeUpgradeModal,
    openLicenseDialog,
    tier,
    usage,
    limits,
    resetsAt,
    lifetimeSlotsRemaining,
    lifetimeSoldOut,
    proAvailable,
  } = useBilling()

  const checkout = getCheckoutUrls()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(upgradeOpen)
  }, [upgradeOpen])

  if (!visible) return null

  const action = upgradeReason?.action
  const actionLabel = ACTION_LABELS[action] || 'requests'
  const showLifetime =
    !lifetimeSoldOut && lifetimeSlotsRemaining > 0 && tier === TIERS.free && checkout.lifetime
  const isPaid = tier === TIERS.lifetime || tier === TIERS.pro_monthly
  const limitHit = Boolean(action)

  return (
    <div className="billing-modal-backdrop" role="presentation" onClick={closeUpgradeModal}>
      <div
        className="billing-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="billing-modal-close"
          onClick={closeUpgradeModal}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="billing-modal-icon" aria-hidden>
          <Sparkles className="h-6 w-6" />
        </div>

        <h2 id="upgrade-modal-title" className="billing-modal-title">
          {limitHit
            ? 'Limit reached'
            : isPaid
              ? `${tierLabel(tier)} plan`
              : 'Get VoidTube License'}
        </h2>

        {isPaid && !limitHit ? (
          <p className="billing-modal-copy">
            You&apos;re on the {tierLabel(tier)} plan. Usage resets on{' '}
            {formatResetDate(resetsAt)}. No account required — your license key is all you need.
          </p>
        ) : (
          <p className="billing-modal-copy">
            {limitHit
              ? `You've used all ${limits[action] ?? 'your'} free ${actionLabel} this month. Buy a license or enter your key in Settings. Resets on ${formatResetDate(resetsAt)}.`
              : 'Choose Lifetime or Monthly Supporter. After checkout, paste your license key in Settings — no account signup needed.'}
          </p>
        )}

        {!isPaid && (
          <div className="billing-modal-usage">
            <UsageRow label="Searches" used={usage.search} limit={limits.search} />
            <UsageRow label="Transcripts" used={usage.transcript} limit={limits.transcript} />
            <UsageRow label="Playlists" used={usage.playlist} limit={limits.playlist} />
          </div>
        )}

        {!isPaid && (
          <div className="billing-modal-actions">
            {showLifetime ? (
              <a
                href={checkout.lifetime}
                target="_blank"
                rel="noopener noreferrer"
                className={cn('billing-checkout-btn billing-checkout-lifetime')}
              >
                <span>
                  Buy Lifetime — €39
                  <small>{lifetimeSlotsRemaining} of 10 founding spots left</small>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 opacity-70" />
              </a>
            ) : lifetimeSoldOut ? (
              <p className="billing-sold-out">Founding Lifetime sold out</p>
            ) : null}

            {proAvailable && checkout.pro ? (
              <a
                href={checkout.pro}
                target="_blank"
                rel="noopener noreferrer"
                className={cn('billing-checkout-btn billing-checkout-pro')}
              >
                <span>
                  Buy Monthly Supporter — €7/mo
                  <small>Cancel anytime</small>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 opacity-70" />
              </a>
            ) : proAvailable ? (
              <div className="billing-checkout-btn billing-checkout-pro billing-checkout-disabled">
                <span>
                  Monthly Supporter — €7/mo
                  <small>Checkout link coming soon — use Lifetime for now</small>
                </span>
              </div>
            ) : null}
          </div>
        )}

        <button
          type="button"
          className="billing-license-link"
          onClick={() => {
            closeUpgradeModal()
            openLicenseDialog()
          }}
        >
          <KeyRound className="h-3.5 w-3.5" />
          Already purchased? Enter license key in Settings
        </button>
      </div>
    </div>
  )
}

function UsageRow({ label, used, limit }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  return (
    <div className="billing-usage-row">
      <div className="billing-usage-label">
        <span>{label}</span>
        <span>
          {used}/{limit >= 999999 ? '∞' : limit}
        </span>
      </div>
      <div className="billing-usage-bar">
        <div className="billing-usage-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

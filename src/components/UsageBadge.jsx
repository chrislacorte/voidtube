import { cn } from '../lib/utils'
import { TIERS } from '../lib/license'
import { useBilling } from '../stores/BillingProvider'

function formatLimit(used, limit) {
  if (limit >= 999999) return `${used} used`
  return `${used}/${limit}`
}

export default function UsageBadge({ className, onClick }) {
  const { tier, usage, limits, loading, openUpgradeModal } = useBilling()

  if (loading) return null

  const isFree = tier === TIERS.free
  const searchLabel = formatLimit(usage.search, limits.search)

  const handleClick = () => {
    if (onClick) {
      onClick()
      return
    }
    openUpgradeModal()
  }

  return (
    <button
      type="button"
      className={cn('usage-badge', !isFree && 'usage-badge-paid', className)}
      onClick={handleClick}
      title="View usage and upgrade options"
    >
      <span className="usage-badge-tier">
        {isFree ? 'Free' : tier === TIERS.lifetime ? 'Lifetime' : 'Monthly'}
      </span>
      <span className="usage-badge-sep" aria-hidden>
        ·
      </span>
      <span className="usage-badge-count">{searchLabel} searches</span>
    </button>
  )
}

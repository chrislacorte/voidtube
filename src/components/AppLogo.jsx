import { BRAND } from '../lib/brand'
import { cn } from '../lib/utils'

export default function AppLogo({ className = '' }) {
  return (
    <a href={BRAND.homeHref} className={cn('top-bar-logo', className)} aria-label={BRAND.logoAlt}>
      <img src={BRAND.logoSrc} alt="" className="top-bar-logo-icon" draggable={false} />
      <span className="top-bar-logo-text">{BRAND.name}</span>
    </a>
  )
}

/** Polar product config — values come from environment variables only. */
export function getPolarConfig() {
  return {
    organizationId:
      import.meta.env.VITE_POLAR_ORGANIZATION_ID?.trim() ||
      import.meta.env.POLAR_ORGANIZATION_ID?.trim() ||
      '',
    lifetimeBenefitId: import.meta.env.VITE_POLAR_LIFETIME_BENEFIT_ID?.trim() || '',
    proBenefitId: import.meta.env.VITE_POLAR_PRO_BENEFIT_ID?.trim() || '',
    lifetimeCheckoutUrl: import.meta.env.VITE_POLAR_LIFETIME_CHECKOUT_URL?.trim() || '',
    proCheckoutUrl: import.meta.env.VITE_POLAR_PRO_CHECKOUT_URL?.trim() || '',
  }
}

export function getCheckoutUrls() {
  const config = getPolarConfig()
  return {
    lifetime: config.lifetimeCheckoutUrl,
    pro: config.proCheckoutUrl,
  }
}

export function tierFromBenefitId(benefitId) {
  if (!benefitId) return 'free'
  const config = getPolarConfig()
  if (config.lifetimeBenefitId && benefitId === config.lifetimeBenefitId) return 'lifetime'
  if (config.proBenefitId && benefitId === config.proBenefitId) return 'pro_monthly'
  return 'free'
}

export function tierLabel(tier) {
  switch (tier) {
    case 'lifetime':
      return 'Lifetime'
    case 'pro_monthly':
      return 'Monthly Supporter'
    default:
      return 'Free'
  }
}

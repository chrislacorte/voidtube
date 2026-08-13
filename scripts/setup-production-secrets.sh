#!/usr/bin/env bash
# Configure Cloudflare Pages secrets for voidtube production.
# Run from project root after: npm run build && wrangler pages deploy
#
# Usage:
#   export YOUTUBE_API_KEY=...
#   export POLAR_ORGANIZATION_ID=...
#   export POLAR_WEBHOOK_SECRET=...
#   export POLAR_LIFETIME_BENEFIT_ID=...
#   export POLAR_LIFETIME_PRODUCT_ID=...   # from Polar dashboard
#   ./scripts/setup-production-secrets.sh

set -euo pipefail

PROJECT="${VOIDTUBE_PAGES_PROJECT:-voidtube}"

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

require_var YOUTUBE_API_KEY
require_var POLAR_ORGANIZATION_ID
require_var POLAR_WEBHOOK_SECRET

echo "Setting Pages secrets on project: $PROJECT"

echo "$YOUTUBE_API_KEY" | npx wrangler pages secret put YOUTUBE_API_KEY --project-name="$PROJECT"
echo "$POLAR_ORGANIZATION_ID" | npx wrangler pages secret put POLAR_ORGANIZATION_ID --project-name="$PROJECT"
echo "$POLAR_WEBHOOK_SECRET" | npx wrangler pages secret put POLAR_WEBHOOK_SECRET --project-name="$PROJECT"

if [[ -n "${POLAR_LIFETIME_BENEFIT_ID:-}" ]]; then
  echo "$POLAR_LIFETIME_BENEFIT_ID" | npx wrangler pages secret put POLAR_LIFETIME_BENEFIT_ID --project-name="$PROJECT"
fi

if [[ -n "${POLAR_LIFETIME_PRODUCT_ID:-}" ]]; then
  echo "$POLAR_LIFETIME_PRODUCT_ID" | npx wrangler pages secret put POLAR_LIFETIME_PRODUCT_ID --project-name="$PROJECT"
fi

if [[ -n "${POLAR_PRO_BENEFIT_ID:-}" ]]; then
  echo "$POLAR_PRO_BENEFIT_ID" | npx wrangler pages secret put POLAR_PRO_BENEFIT_ID --project-name="$PROJECT"
fi

if [[ -n "${POLAR_PRO_PRODUCT_ID:-}" ]]; then
  echo "$POLAR_PRO_PRODUCT_ID" | npx wrangler pages secret put POLAR_PRO_PRODUCT_ID --project-name="$PROJECT"
fi

echo "Done. Also set Cloudflare Pages build environment variables (public):"
echo "  VITE_POLAR_LIFETIME_CHECKOUT_URL"
echo "  VITE_POLAR_LIFETIME_BENEFIT_ID"
echo "  VITE_POLAR_PRO_CHECKOUT_URL (when monthly product exists)"

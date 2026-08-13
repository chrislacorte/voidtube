#!/usr/bin/env bash
# Start the VoidTube transcript relay locally + expose via Cloudflare quick tunnel.
# Requires TRANSCRIPT_PROXY_SECRET in .env (same value as Cloudflare Pages secret).
#
# Usage:
#   ./scripts/start-transcript-relay-tunnel.sh
#
# After the tunnel URL appears, set it on Pages:
#   printf '%s' 'https://YOUR-URL.trycloudflare.com' | npx wrangler pages secret put TRANSCRIPT_PROXY_URL --project-name=voidtube
#
# Note: Quick tunnel URLs change on restart. For 24/7 production use Render/Railway
# (see docs/TRANSCRIPT_PRODUCTION.md and render.yaml).

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${TRANSCRIPT_PROXY_SECRET:-}" ]]; then
  echo "TRANSCRIPT_PROXY_SECRET missing in .env"
  exit 1
fi

PORT="${TRANSCRIPT_PROXY_PORT:-8788}"

if lsof -i ":$PORT" >/dev/null 2>&1; then
  echo "Port $PORT already in use (relay may already be running)."
else
  echo "Starting transcript relay on port $PORT..."
  npm run transcript-proxy &
  RELAY_PID=$!
  trap 'kill $RELAY_PID 2>/dev/null || true' EXIT
  sleep 1
fi

echo "Starting Cloudflare quick tunnel (Ctrl+C stops tunnel)..."
echo "Set TRANSCRIPT_PROXY_URL on Pages to the https://….trycloudflare.com URL shown below."
exec npx --yes cloudflared tunnel --url "http://127.0.0.1:$PORT"

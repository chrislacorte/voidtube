#!/usr/bin/env bash
# Smoke test VoidTube production API at voidtube.pages.dev
# Usage: ./scripts/smoke-test-production.sh [base_url]

set -euo pipefail

BASE="${1:-https://voidtube.pages.dev}"
DEVICE_ID="$(uuidgen 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())')"

pass=0
fail=0

check() {
  local name="$1"
  local ok="$2"
  if [[ "$ok" == "1" ]]; then
    echo "PASS  $name"
    pass=$((pass + 1))
  else
    echo "FAIL  $name"
    fail=$((fail + 1))
  fi
}

echo "Smoke testing: $BASE"
echo "Device ID: $DEVICE_ID"
echo

# Health — should not leak API key status
health=$(curl -sf "$BASE/api/health" || echo '{}')
if echo "$health" | grep -q '"ok"[[:space:]]*:[[:space:]]*true' && ! echo "$health" | grep -q 'youtubeApiKeyConfigured'; then
  check "GET /api/health (no key leak)" 1
else
  check "GET /api/health (no key leak)" 0
  echo "      Response: $health"
fi

# Billing status
status_code=$(curl -s -o /tmp/voidtube-billing.json -w "%{http_code}" \
  -H "X-VoidTube-Device-Id: $DEVICE_ID" \
  "$BASE/api/billing/status")
if [[ "$status_code" == "200" ]]; then
  check "GET /api/billing/status" 1
else
  check "GET /api/billing/status (HTTP $status_code)" 0
fi

# Search (requires YOUTUBE_API_KEY secret)
search_code=$(curl -s -o /tmp/voidtube-search.json -w "%{http_code}" \
  -H "X-VoidTube-Device-Id: $DEVICE_ID" \
  "$BASE/api/youtube/search?q=react&maxResults=3")
if [[ "$search_code" == "200" ]] && grep -q '"results"' /tmp/voidtube-search.json 2>/dev/null; then
  check "GET /api/youtube/search" 1
elif [[ "$search_code" == "500" ]]; then
  check "GET /api/youtube/search (YOUTUBE_API_KEY missing?)" 0
  echo "      Hint: set YOUTUBE_API_KEY Pages secret"
else
  check "GET /api/youtube/search (HTTP $search_code)" 0
fi

# Validate without device ID should fail
validate_code=$(curl -s -o /tmp/voidtube-validate.json -w "%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -d '{"key":"test-key"}' \
  "$BASE/api/billing/validate")
if [[ "$validate_code" == "400" ]]; then
  check "POST /api/billing/validate rejects missing deviceId" 1
else
  check "POST /api/billing/validate rejects missing deviceId (HTTP $validate_code)" 0
fi

# Webhook without secret/signature should fail (503 if secret missing, 401 if invalid sig)
webhook_code=$(curl -s -o /tmp/voidtube-webhook.json -w "%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -d '{"type":"order.created"}' \
  "$BASE/api/polar/webhook")
if [[ "$webhook_code" == "401" || "$webhook_code" == "503" ]]; then
  check "POST /api/polar/webhook rejects unsigned requests" 1
else
  check "POST /api/polar/webhook rejects unsigned (HTTP $webhook_code)" 0
  echo "      Response: $(cat /tmp/voidtube-webhook.json)"
fi

# CORS — disallowed origin should not get ACAO header
cors_headers=$(curl -s -I -H "Origin: https://evil.example" \
  -H "X-VoidTube-Device-Id: $DEVICE_ID" \
  "$BASE/api/health" || true)
if echo "$cors_headers" | grep -qi 'access-control-allow-origin: https://evil.example'; then
  check "CORS blocks unknown origins" 0
else
  check "CORS blocks unknown origins" 1
fi

echo
echo "Results: $pass passed, $fail failed"
[[ "$fail" -eq 0 ]]

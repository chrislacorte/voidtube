# Cloudflare Rate Limiting for VoidTube API

Protect `/api/*` from abuse and reduce YouTube API key cost exposure. Configure in the Cloudflare dashboard (requires a plan that supports Rate Limiting rules, or use WAF custom rules as an alternative).

## Recommended rule

**Zone:** `voidtube.pages.dev` (or your Cloudflare zone if using a custom domain)

| Setting | Value |
|---------|-------|
| Rule name | VoidTube API rate limit |
| Expression | `(http.request.uri.path starts_with "/api/")` |
| Characteristics | IP |
| Period | 60 seconds |
| Requests | 60 |
| Action | Block (or Managed Challenge for softer limit) |

## Endpoints to protect

All metered routes share the same prefix:

- `GET /api/youtube/search`
- `GET /api/youtube/transcript/:id`
- `POST /api/playlist/generate`
- `POST /api/billing/validate`
- `GET /api/billing/status`

`/api/polar/webhook` should **not** be rate-limited as aggressively — Polar retries webhooks. Exempt if needed:

```
(http.request.uri.path starts_with "/api/") and not (http.request.uri.path eq "/api/polar/webhook")
```

## WAF alternative (free tier)

If Rate Limiting rules are unavailable, use a WAF custom rule with similar expression and a lower threshold, or enable **Bot Fight Mode** for the zone.

## Verify

After enabling, run `./scripts/smoke-test-production.sh` — normal usage should pass; burst >60 req/min from one IP should receive 429/blocked responses.

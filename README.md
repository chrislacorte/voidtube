# VoidTube

Distraction-free YouTube learning canvas — search, transcript, timeline checkpoints, focus mode, and multi-canvas playlists.

## Live

**https://voidtube.pages.dev**

## Quick Start (local)

```bash
npm install
cp .env.example .env
# Set YOUTUBE_API_KEY in .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). API on port 3001 (Express) or Vite middleware.

## Production deploy (Cloudflare Pages)

### 1. Build and deploy

```bash
npm run build
npm run deploy
# or: npx wrangler pages deploy dist --project-name=voidtube
```

KV namespace `USAGE_KV` is configured in [`wrangler.toml`](wrangler.toml) for usage metering and billing.

### 2. Set Pages secrets (required)

```bash
export YOUTUBE_API_KEY=...
export POLAR_ORGANIZATION_ID=...      # from Polar dashboard
export POLAR_WEBHOOK_SECRET=...       # from Polar webhook endpoint
export POLAR_LIFETIME_BENEFIT_ID=...
export POLAR_LIFETIME_PRODUCT_ID=...  # optional, for webhook tier mapping
./scripts/setup-production-secrets.sh
```

**Never** expose `YOUTUBE_API_KEY` or `POLAR_WEBHOOK_SECRET` as `VITE_*` build variables.

### 3. Polar webhook

In Polar dashboard, set webhook URL to:

`https://voidtube.pages.dev/api/polar/webhook`

Use the Standard Webhooks secret from Polar (base64-encoded). Unsigned webhooks are rejected.

### 4. Pages build environment (public, OK)

Set in Cloudflare Pages → Settings → Environment variables:

| Variable | Purpose |
|----------|---------|
| `VITE_POLAR_LIFETIME_CHECKOUT_URL` | Polar checkout link |
| `VITE_POLAR_LIFETIME_BENEFIT_ID` | License benefit ID |
| `VITE_POLAR_PRO_CHECKOUT_URL` | Monthly supporter checkout (when available) |

### 5. Security hardening (manual)

- **YouTube API key:** [docs/GCP_YOUTUBE_KEY.md](docs/GCP_YOUTUBE_KEY.md) — restrict to YouTube Data API v3 only
- **Rate limiting:** [docs/CLOUDFLARE_RATE_LIMIT.md](docs/CLOUDFLARE_RATE_LIMIT.md) — ~60 req/min/IP on `/api/*`

### 6. Smoke test

After deploy and secrets:

```bash
./scripts/smoke-test-production.sh
# or against preview: ./scripts/smoke-test-production.sh https://preview.pages.dev
```

## Production feature matrix

| Feature | voidtube.pages.dev | Notes |
|---------|-------------------|-------|
| YouTube search | OK | Requires `YOUTUBE_API_KEY` secret |
| Video chapters | OK | Not metered |
| Playlist generate | OK | Usage-gated; Workers AI optional |
| Transcript | OK | Browser → [youtube-transcript.ai](https://youtube-transcript.ai/youtube-transcript-api) |
| Billing / limits | OK | Requires KV + secrets |
| License activation | OK | Requires `POLAR_ORGANIZATION_ID` |

## Environment variables

See [`.env.example`](.env.example). Server-only secrets go to Cloudflare Pages secrets or local `.env` — not the client bundle.

| Variable | Where | Description |
|----------|-------|-------------|
| `YOUTUBE_API_KEY` | Pages secret / `.env` | YouTube Data API v3 (server only) |
| `POLAR_ORGANIZATION_ID` | Pages secret | License validation |
| `POLAR_WEBHOOK_SECRET` | Pages secret | Polar webhook HMAC (required) |
| `POLAR_LIFETIME_BENEFIT_ID` | Pages secret | Benefit ID for tier mapping |
| `VITE_POLAR_*` | Pages build env | Public checkout URLs and benefit IDs |

## Architecture

- **Frontend:** static assets in `dist/`
- **API:** Pages Functions [`functions/api/[[path]].js`](functions/api/[[path]].js)
- **Usage metering:** Cloudflare KV (`USAGE_KV`)
- **Local dev:** Express [`server/`](server/) + Vite middleware

## Security notes

- YouTube API key is only used server-side — never in `src/` or `VITE_*`
- CORS allows `https://voidtube.pages.dev` and `localhost:5173` only
- `/api/health` returns `{ ok: true }` only (no key leak)
- `/api/polar/webhook` requires valid Standard Webhooks signature
- `/api/billing/validate` requires valid `X-VoidTube-Device-Id`

## Tech stack

- React 19 + Vite 8 + Tailwind CSS v4
- `@xyflow/react`, TipTap, Motion
- Express (local) / Cloudflare Pages Functions (production)
- Polar.sh for licensing

## Reset local data

```js
localStorage.removeItem('voidtube-v2')
localStorage.removeItem('voidtube-device-id')
localStorage.removeItem('voidtube-license-key')
```

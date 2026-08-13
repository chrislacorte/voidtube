# Google Cloud — YouTube API Key Hardening

The YouTube Data API key must **only** exist server-side (Cloudflare Pages secret `YOUTUBE_API_KEY`). Never use `VITE_YOUTUBE_API_KEY` or expose the key in the client bundle.

## Console steps

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Select your API key used by VoidTube
3. **API restrictions** → Restrict key → enable only:
   - **YouTube Data API v3**
4. **Application restrictions** → **None**
   - Cloudflare Workers use dynamic egress IPs; IP allowlisting is not practical
   - Protection is enforced by the backend proxy + usage metering on `/api/*`
5. **Quotas** → YouTube Data API v3 → review daily quota (default 10,000 units/day)
6. **Billing** → set budget alerts for unexpected API spend

## Verify key is not leaked

After deploy, open https://voidtube.pages.dev in DevTools:

- **Network** tab: no response or request should contain the API key string
- **Sources** tab: search bundled JS for your key prefix — should not appear

Run the smoke test:

```bash
./scripts/smoke-test-production.sh
```

## If the key is compromised

1. Disable or delete the key in GCP immediately
2. Create a new key with the restrictions above
3. Update the Cloudflare secret:
   ```bash
   npx wrangler pages secret put YOUTUBE_API_KEY --project-name=voidtube
   ```
4. Redeploy is not required — Pages secrets are available at runtime immediately

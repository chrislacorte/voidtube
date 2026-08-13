/**
 * Node-only HTTP proxy for Innertube transcript fetches.
 * Kept separate so Cloudflare Workers bundles never pull in undici.
 */
export async function createProxyFetch(proxy) {
  const { ProxyAgent, fetch: undiciFetch } = await import('undici')
  const agent = new ProxyAgent(proxy)
  return (url, options) => undiciFetch(url, { ...options, dispatcher: agent })
}

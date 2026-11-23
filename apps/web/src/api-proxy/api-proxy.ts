/** Headers only this proxy may set; anything a client sends under these names is dropped. */
const CLIENT_IP = 'x-client-ip';
const PROXY_SECRET = 'x-proxy-secret';

export interface ApiProxyEnv {
  /** Origin of the Nest API, e.g. https://cga-api.vercel.app */
  apiUrl: string;
  /** Shared with the API so it trusts the forwarded visitor IP; unset disables forwarding. */
  proxySecret: string | undefined;
}

/**
 * Builds the request the web app forwards to the API for a same-origin /api/* call.
 * The browser only ever talks to the web origin (first-party session cookie). On
 * Vercel, X-Forwarded-For here is set by the platform, so its first entry is the
 * real visitor; the API cannot see it itself because it sits behind this proxy.
 */
export function apiProxyRequest(
  request: { url: string; headers: Headers },
  { apiUrl, proxySecret }: ApiProxyEnv,
): { url: string; headers: Headers } {
  const incoming = new URL(request.url);
  const url = `${apiUrl.replace(/\/$/, '')}${incoming.pathname.replace(/^\/api/, '')}${incoming.search}`;

  const headers = new Headers(request.headers);
  headers.delete(CLIENT_IP);
  headers.delete(PROXY_SECRET);
  const visitor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (proxySecret && visitor) {
    headers.set(CLIENT_IP, visitor);
    headers.set(PROXY_SECRET, proxySecret);
  }
  return { url, headers };
}

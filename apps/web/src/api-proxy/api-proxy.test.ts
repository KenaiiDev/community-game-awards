import { describe, expect, it } from 'vitest';
import { apiProxyRequest } from './api-proxy';

const env = { apiUrl: 'https://api.example.test', proxySecret: 's'.repeat(32) };

function request(path: string, headers: Record<string, string> = {}) {
  return { url: `https://web.example.test${path}`, headers: new Headers(headers) };
}

describe('API proxy', () => {
  it('maps /api/* to the API origin, keeping the path and query', () => {
    const { url } = apiProxyRequest(request('/api/auth/discord/callback?code=c&state=s'), env);
    expect(url).toBe('https://api.example.test/auth/discord/callback?code=c&state=s');
  });

  it("forwards the visitor's IP (set by the platform) with the shared secret", () => {
    const { headers } = apiProxyRequest(request('/api/me', { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }), env);
    expect(headers.get('x-client-ip')).toBe('203.0.113.7');
    expect(headers.get('x-proxy-secret')).toBe(env.proxySecret);
  });

  it('never passes through client-sent proxy headers', () => {
    const { headers } = apiProxyRequest(
      request('/api/me', { 'x-client-ip': '1.2.3.4', 'x-proxy-secret': 'guess' }),
      env,
    );
    expect(headers.get('x-client-ip')).toBeNull();
    expect(headers.get('x-proxy-secret')).toBeNull();
  });

  it('keeps cookies and other request headers', () => {
    const { headers } = apiProxyRequest(request('/api/me', { cookie: 'session=abc', 'content-type': 'application/json' }), env);
    expect(headers.get('cookie')).toBe('session=abc');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('forwards no secret when none is configured', () => {
    const { headers } = apiProxyRequest(request('/api/me', { 'x-forwarded-for': '203.0.113.7' }), {
      apiUrl: 'http://localhost:4000/',
      proxySecret: undefined,
    });
    expect(headers.get('x-proxy-secret')).toBeNull();
    expect(headers.get('x-client-ip')).toBeNull();
  });
});

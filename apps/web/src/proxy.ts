import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { apiProxyRequest } from './api-proxy/api-proxy';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Read at request time, so API_URL can change without rebuilding the web app.
    const { url, headers } = apiProxyRequest(request, {
      apiUrl: process.env.API_URL ?? 'http://localhost:4000',
      proxySecret: process.env.PROXY_SECRET,
    });
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return intl(request);
}

export const config = {
  // /api/* is proxied to Nest; everything else except Next internals and static
  // files goes through language detection.
  matcher: ['/api/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};

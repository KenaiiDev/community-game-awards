import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // The browser only talks to this origin; /api/* is forwarded to the Nest API so
  // the session cookie stays first-party and SameSite=Lax keeps protecting POSTs.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);

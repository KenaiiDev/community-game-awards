import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // /api/* is forwarded to the Nest API by src/proxy.ts (with the visitor's IP for
  // rate limiting), so the browser only talks to this origin and the session cookie
  // stays first-party.
};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);

import { z } from 'zod';

export interface AppConfig {
  /** Public origin of the Next.js app; the API is served behind it at /api. */
  webUrl: string;
  sessionSecret: string;
  cookieSecure: boolean;
  /** Trust X-Forwarded-For from the platform (true on Vercel) to read the client IP. */
  trustProxy: boolean;
  /** Shared with the web app's proxy, which forwards the visitor's IP; null disables it. */
  proxySecret: string | null;
  discord: { clientId: string; clientSecret: string; redirectUri: string };
}

export const APP_CONFIG = Symbol('AppConfig');

const envSchema = z.object({
  // Read by PrismaService directly; validated here so a missing value fails at startup.
  DATABASE_URL: z.string().min(1),
  WEB_URL: z.url(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('true'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  PROXY_SECRET: z.string().min(32, 'PROXY_SECRET must be at least 32 characters').optional(),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.url(),
});

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  return {
    webUrl: parsed.WEB_URL.replace(/\/$/, ''),
    sessionSecret: parsed.SESSION_SECRET,
    cookieSecure: parsed.COOKIE_SECURE === 'true',
    trustProxy: parsed.TRUST_PROXY === 'true',
    proxySecret: parsed.PROXY_SECRET ?? null,
    discord: {
      clientId: parsed.DISCORD_CLIENT_ID,
      clientSecret: parsed.DISCORD_CLIENT_SECRET,
      redirectUri: parsed.DISCORD_REDIRECT_URI,
    },
  };
}

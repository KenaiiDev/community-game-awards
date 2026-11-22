import { z } from 'zod';

export interface AppConfig {
  /** Public origin of the Next.js app; the API is served behind it at /api. */
  webUrl: string;
  sessionSecret: string;
  cookieSecure: boolean;
  discord: { clientId: string; clientSecret: string; redirectUri: string };
}

export const APP_CONFIG = Symbol('AppConfig');

const envSchema = z.object({
  // Read by PrismaService directly; validated here so a missing value fails at startup.
  DATABASE_URL: z.string().min(1),
  WEB_URL: z.url(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('true'),
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
    discord: {
      clientId: parsed.DISCORD_CLIENT_ID,
      clientSecret: parsed.DISCORD_CLIENT_SECRET,
      redirectUri: parsed.DISCORD_REDIRECT_URI,
    },
  };
}

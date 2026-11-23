import { loadAppConfig } from './app-config.js';

const validEnv = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  WEB_URL: 'http://localhost:3000/',
  SESSION_SECRET: 'x'.repeat(32),
  DISCORD_CLIENT_ID: 'cid',
  DISCORD_CLIENT_SECRET: 'secret',
  DISCORD_REDIRECT_URI: 'http://localhost:3000/api/auth/discord/callback',
};

describe('loadAppConfig', () => {
  it('parses a valid environment, trims the web URL and defaults secure cookies on', () => {
    expect(loadAppConfig(validEnv)).toEqual({
      webUrl: 'http://localhost:3000',
      sessionSecret: 'x'.repeat(32),
      cookieSecure: true,
      trustProxy: false,
      proxySecret: null,
      discord: {
        clientId: 'cid',
        clientSecret: 'secret',
        redirectUri: 'http://localhost:3000/api/auth/discord/callback',
      },
    });
  });

  it('reads the proxy settings used to find the client IP behind Vercel', () => {
    const config = loadAppConfig({ ...validEnv, TRUST_PROXY: 'true', PROXY_SECRET: 'p'.repeat(32) });
    expect(config).toMatchObject({ trustProxy: true, proxySecret: 'p'.repeat(32) });
  });

  it('rejects a proxy secret shorter than 32 characters', () => {
    expect(() => loadAppConfig({ ...validEnv, PROXY_SECRET: 'short' })).toThrow(/PROXY_SECRET/);
  });

  it('allows disabling secure cookies for local http development', () => {
    expect(loadAppConfig({ ...validEnv, COOKIE_SECURE: 'false' }).cookieSecure).toBe(false);
  });

  it.each(['DATABASE_URL', 'WEB_URL', 'SESSION_SECRET', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI'])(
    'fails fast at startup when %s is missing',
    (key) => {
      const env: Record<string, string> = { ...validEnv };
      delete env[key];
      expect(() => loadAppConfig(env)).toThrow(key);
    },
  );

  it('rejects a session secret shorter than 32 characters', () => {
    expect(() => loadAppConfig({ ...validEnv, SESSION_SECRET: 'short' })).toThrow('SESSION_SECRET');
  });
});

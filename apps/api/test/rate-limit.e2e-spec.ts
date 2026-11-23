import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { APP_CONFIG, type AppConfig } from '../src/config/app-config.js';
import { DISCORD_OAUTH, USER_REPOSITORY } from '../src/auth/application/ports.js';
import { CLOCK, EDITION_REPOSITORY, JUDGE_APPLICATION_REPOSITORY } from '../src/judge-applications/application/ports.js';
import { FakeDiscordOAuth } from '../src/auth/infrastructure/fake-discord-oauth.js';
import { InMemoryUserRepository } from '../src/auth/infrastructure/in-memory-user.repository.js';
import { InMemoryEditionRepository } from '../src/judge-applications/infrastructure/in-memory-edition.repository.js';
import { InMemoryJudgeApplicationRepository } from '../src/judge-applications/infrastructure/in-memory-judge-application.repository.js';
import { RATE_LIMITS } from '../src/rate-limit/rate-limits.js';

const PROXY_SECRET = 'proxy-secret-that-is-at-least-32-characters';
const config: AppConfig = {
  webUrl: 'http://web.test',
  sessionSecret: 'test-session-secret-that-is-at-least-32-chars',
  cookieSecure: false,
  trustProxy: false,
  proxySecret: PROXY_SECRET,
  cronSecret: null,
  discord: { clientId: 'cid', clientSecret: 'secret', redirectUri: 'http://web.test/api/auth/discord/callback' },
};
const edition = {
  id: 'edition-1',
  slug: 'express-2026',
  name: 'Express 2026',
  signupOpensAt: new Date('2026-11-20T00:00:00Z'),
  signupClosesAt: new Date('2026-12-01T00:00:00Z'),
};

async function createApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG).useValue(config)
    .overrideProvider(DISCORD_OAUTH).useValue(new FakeDiscordOAuth({ 'good-code': { id: '1', username: 'k', globalName: 'K', avatar: null } }))
    .overrideProvider(USER_REPOSITORY).useValue(new InMemoryUserRepository())
    .overrideProvider(EDITION_REPOSITORY).useValue(new InMemoryEditionRepository([edition]))
    .overrideProvider(JUDGE_APPLICATION_REPOSITORY).useValue(new InMemoryJudgeApplicationRepository())
    .overrideProvider(CLOCK).useValue({ now: () => new Date('2026-11-25T12:00:00Z') })
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

/** A request as forwarded by the web app's proxy for a given visitor. */
function viaWeb(req: request.Test, clientIp: string, secret = PROXY_SECRET) {
  return req.set('x-client-ip', clientIp).set('x-proxy-secret', secret);
}

describe('Rate limiting (e2e)', () => {
  let app: INestApplication;
  afterEach(async () => app?.close());

  it('sends sign-in back to the web app with a rate_limited error once the limit is reached', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    for (let i = 0; i < RATE_LIMITS.auth.limit; i++) {
      const ok = await request(server).get('/auth/discord').expect(302);
      expect(ok.headers.location).toMatch(/^https:\/\/discord\.test\//);
    }
    const limited = await request(server).get('/auth/discord').expect(302);
    expect(limited.headers.location).toBe('http://web.test/?auth_error=rate_limited');
  });

  it('answers writes over the limit with 429, a rate_limited code and Retry-After', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    for (let i = 0; i < RATE_LIMITS.write.limit; i++) {
      // Unauthenticated, so each answers 401, but every attempt still counts.
      await request(server).post('/judge-applications').send({ consent: true }).expect(401);
    }
    const limited = await request(server).post('/judge-applications').send({ consent: true }).expect(429);
    expect(limited.body).toEqual({ code: 'rate_limited', message: expect.any(String) });
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('limits reads too, with a more generous budget', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    for (let i = 0; i < RATE_LIMITS.default.limit; i++) {
      await request(server).get('/editions/current').expect(200);
    }
    const limited = await request(server).get('/editions/current').expect(429);
    expect(limited.body.code).toBe('rate_limited');
  });

  it('counts each visitor separately when the web proxy forwards their IP with the shared secret', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    for (let i = 0; i < RATE_LIMITS.auth.limit; i++) {
      await viaWeb(request(server).get('/auth/discord'), '203.0.113.1').expect(302);
    }
    const a = await viaWeb(request(server).get('/auth/discord'), '203.0.113.1').expect(302);
    expect(a.headers.location).toContain('auth_error=rate_limited');
    const b = await viaWeb(request(server).get('/auth/discord'), '203.0.113.2').expect(302);
    expect(b.headers.location).toMatch(/^https:\/\/discord\.test\//);
  });

  it('ignores a forwarded IP without the right secret, so spoofing it does not reset the limit', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    for (let i = 0; i < RATE_LIMITS.auth.limit; i++) {
      await viaWeb(request(server).get('/auth/discord'), `198.51.100.${i}`, 'wrong-secret').expect(302);
    }
    const spoofed = await viaWeb(request(server).get('/auth/discord'), '198.51.100.250', 'wrong-secret').expect(302);
    expect(spoofed.headers.location).toContain('auth_error=rate_limited');
  });
});

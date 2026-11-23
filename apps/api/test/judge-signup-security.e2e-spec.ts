import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SignJWT, UnsecuredJWT } from 'jose';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { APP_CONFIG, type AppConfig, loadAppConfig } from '../src/config/app-config.js';
import { DISCORD_OAUTH, USER_REPOSITORY } from '../src/auth/application/ports.js';
import {
  CLOCK,
  EDITION_REPOSITORY,
  JUDGE_APPLICATION_REPOSITORY,
} from '../src/judge-applications/application/ports.js';
import { FakeDiscordOAuth } from '../src/auth/infrastructure/fake-discord-oauth.js';
import { InMemoryUserRepository } from '../src/auth/infrastructure/in-memory-user.repository.js';
import { InMemoryEditionRepository } from '../src/judge-applications/infrastructure/in-memory-edition.repository.js';
import { InMemoryJudgeApplicationRepository } from '../src/judge-applications/infrastructure/in-memory-judge-application.repository.js';

const SECRET = 'test-session-secret-that-is-at-least-32-chars';
const CLIENT_SECRET = 'supersecret-discord-client';
const config: AppConfig = {
  webUrl: 'http://web.test',
  sessionSecret: SECRET,
  cookieSecure: true,
  trustProxy: false,
  proxySecret: null,
  discord: { clientId: 'cid', clientSecret: CLIENT_SECRET, redirectUri: 'http://web.test/api/auth/discord/callback' },
};
const edition = {
  id: 'e1',
  slug: 'x',
  name: 'X',
  signupOpensAt: new Date('2026-11-20T00:00:00Z'),
  signupClosesAt: new Date('2026-12-01T00:00:00Z'),
};
const key = new TextEncoder().encode(SECRET);

let now: Date;
let applications: InMemoryJudgeApplicationRepository;
let users: InMemoryUserRepository;
let app: INestApplication;

beforeEach(async () => {
  now = new Date('2026-11-25T12:00:00Z');
  applications = new InMemoryJudgeApplicationRepository();
  users = new InMemoryUserRepository();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG).useValue(config)
    .overrideProvider(DISCORD_OAUTH).useValue(new FakeDiscordOAuth({ c: { id: '1', username: 'u', globalName: null, avatar: null } }))
    .overrideProvider(USER_REPOSITORY).useValue(users)
    .overrideProvider(EDITION_REPOSITORY).useValue(new InMemoryEditionRepository([edition]))
    .overrideProvider(JUDGE_APPLICATION_REPOSITORY).useValue(applications)
    .overrideProvider(CLOCK).useValue({ now: () => now })
    .compile();
  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
});
afterEach(async () => app.close());

function setCookies(res: request.Response): string[] {
  return (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
}

async function signIn(): Promise<string> {
  const start = await request(app.getHttpServer()).get('/auth/discord');
  const stateCookie = setCookies(start)[0].split(';')[0];
  const state = new URL(start.headers.location).searchParams.get('state');
  const cb = await request(app.getHttpServer())
    .get(`/auth/discord/callback?code=c&state=${state}`)
    .set('Cookie', stateCookie);
  return setCookies(cb).find((c) => c.startsWith('session='))!.split(';')[0];
}

describe('Judge signup security regressions', () => {
  it.each([
    ['no state cookie', 'code=c', undefined],
    ['mismatched state', 'code=c&state=x', 'oauth_state=y'],
    ['state sent as an array', 'code=c&state=a&state=a', 'oauth_state=a'],
    ['empty state', 'code=c&state=', 'oauth_state='],
  ])('creates no session on a callback with %s', async (_label, query, cookie) => {
    const req = request(app.getHttpServer()).get(`/auth/discord/callback?${query}`);
    if (cookie) req.set('Cookie', cookie);
    const res = await req;

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://web.test/?auth_error=state');
    expect(setCookies(res).join(';')).not.toMatch(/session=[^;]/);
  });

  it('issues a short-lived, httpOnly, secure state cookie', async () => {
    const res = await request(app.getHttpServer()).get('/auth/discord');
    const cookie = setCookies(res).find((c) => c.startsWith('oauth_state='))!;
    expect(cookie).toMatch(/Max-Age=600/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it('rejects forged, expired, alg-confused and malformed session tokens with 401', async () => {
    const tokens = [
      new UnsecuredJWT({}).setSubject('u1').encode(),
      await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject('u1').setExpirationTime('1h')
        .sign(new TextEncoder().encode('x'.repeat(40))),
      await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject('u1')
        .setExpirationTime(Math.floor(Date.now() / 1000) - 10).sign(key),
      await new SignJWT({}).setProtectedHeader({ alg: 'HS512' }).setSubject('u1').sign(key),
      await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).sign(key),
      'garbage',
    ];
    for (const token of tokens) {
      const res = await request(app.getHttpServer())
        .post('/judge-applications')
        .set('Cookie', `session=${token}`)
        .send({ consent: true });
      expect(res.status).toBe(401);
    }
  });

  it('only accepts a JSON boolean true as consent', async () => {
    const session = await signIn();
    for (const body of [{ consent: 'true' }, { consent: 1 }, {}, { consent: [true] }]) {
      const res = await request(app.getHttpServer()).post('/judge-applications').set('Cookie', session).send(body);
      expect(res.status).toBe(400);
    }
    const form = await request(app.getHttpServer())
      .post('/judge-applications').set('Cookie', session).type('form').send('consent=true');
    expect(form.status).toBe(400);
  });

  it('enforces the UTC signup window boundaries exactly', async () => {
    const session = await signIn();
    const apply = () =>
      request(app.getHttpServer()).post('/judge-applications').set('Cookie', session).send({ consent: true });

    now = new Date('2026-11-19T23:59:59.999Z');
    expect((await apply()).status).toBe(403);
    now = new Date('2026-12-01T00:00:00.000Z');
    expect((await apply()).status).toBe(403);
    now = new Date('2026-11-20T00:00:00.000Z');
    expect((await apply()).status).toBe(201);
  });

  it('ignores a userId in the body and records the session user', async () => {
    const session = await signIn();
    const res = await request(app.getHttpServer())
      .post('/judge-applications').set('Cookie', session).send({ consent: true, userId: 'other' });

    expect(res.status).toBe(201);
    const sessionUser = await users.findByDiscordId('1');
    expect(await applications.findByUserAndEdition(sessionUser!.id, 'e1')).not.toBeNull();
    expect(await applications.findByUserAndEdition('other', 'e1')).toBeNull();
    expect(JSON.stringify(res.body)).not.toMatch(new RegExp(`${CLIENT_SECRET}|${SECRET}`));
  });
});

describe('Config secret handling', () => {
  const base = {
    DATABASE_URL: 'x',
    WEB_URL: 'http://a',
    SESSION_SECRET: 'a'.repeat(32),
    DISCORD_CLIENT_ID: 'i',
    DISCORD_CLIENT_SECRET: 's',
    DISCORD_REDIRECT_URI: 'http://a/cb',
  };

  it('does not echo a rejected secret in the error message', () => {
    expect(() => loadAppConfig({ ...base, SESSION_SECRET: 'leakycandidate123' })).toThrow();
    try {
      loadAppConfig({ ...base, SESSION_SECRET: 'leakycandidate123' });
    } catch (error) {
      expect((error as Error).message).not.toContain('leakycandidate123');
    }
  });

  it('rejects an empty client secret and an invalid COOKIE_SECURE value', () => {
    expect(() => loadAppConfig({ ...base, DISCORD_CLIENT_SECRET: '' })).toThrow();
    expect(() => loadAppConfig({ ...base, COOKIE_SECURE: 'yes' })).toThrow();
  });
});

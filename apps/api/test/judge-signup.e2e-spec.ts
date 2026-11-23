import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { APP_CONFIG, type AppConfig } from '../src/config/app-config.js';
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
import type { Edition } from '../src/judge-applications/domain/edition.js';

const config: AppConfig = {
  webUrl: 'http://web.test',
  sessionSecret: 'test-session-secret-that-is-at-least-32-chars',
  cookieSecure: false,
  trustProxy: false,
  proxySecret: null,
  cronSecret: null,
  discord: { clientId: 'cid', clientSecret: 'secret', redirectUri: 'http://web.test/api/auth/discord/callback' },
};

const edition: Edition = {
  id: 'edition-1',
  slug: 'express-2026',
  name: 'Express 2026',
  signupOpensAt: new Date('2026-11-20T00:00:00Z'),
  signupClosesAt: new Date('2026-12-01T00:00:00Z'),
};

const profiles = {
  'good-code': { id: '111', username: 'kenaii', globalName: 'Kenaii', avatar: 'abc' },
};

async function createApp(opts: { editions?: Edition[]; now?: Date } = {}) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG).useValue(config)
    .overrideProvider(DISCORD_OAUTH).useValue(new FakeDiscordOAuth(profiles))
    .overrideProvider(USER_REPOSITORY).useValue(new InMemoryUserRepository())
    .overrideProvider(EDITION_REPOSITORY).useValue(new InMemoryEditionRepository(opts.editions ?? [edition]))
    .overrideProvider(JUDGE_APPLICATION_REPOSITORY).useValue(new InMemoryJudgeApplicationRepository())
    .overrideProvider(CLOCK).useValue({ now: () => opts.now ?? new Date('2026-11-25T12:00:00Z') })
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

function cookieNamed(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith(`${name}=`));
}

/** Runs the OAuth round trip and returns the session cookie header value. */
async function signIn(app: INestApplication): Promise<string> {
  const start = await request(app.getHttpServer()).get('/auth/discord');
  const stateCookie = cookieNamed(start, 'oauth_state')!.split(';')[0];
  const state = new URL(start.headers.location).searchParams.get('state');
  const callback = await request(app.getHttpServer())
    .get(`/auth/discord/callback?code=good-code&state=${state}`)
    .set('Cookie', stateCookie);
  return cookieNamed(callback, 'session')!.split(';')[0];
}

describe('Judge signup (e2e)', () => {
  let app: INestApplication;
  afterEach(async () => app?.close());

  describe('GET /editions/current', () => {
    it('returns the active edition with its signup status', async () => {
      app = await createApp();
      const res = await request(app.getHttpServer()).get('/editions/current').expect(200);
      expect(res.body).toEqual({
        slug: 'express-2026',
        name: 'Express 2026',
        signupOpensAt: '2026-11-20T00:00:00.000Z',
        signupClosesAt: '2026-12-01T00:00:00.000Z',
        signupStatus: 'open',
      });
    });

    it('reports closed signup after the deadline', async () => {
      app = await createApp({ now: new Date('2026-12-01T00:00:00Z') });
      const res = await request(app.getHttpServer()).get('/editions/current').expect(200);
      expect(res.body.signupStatus).toBe('closed');
    });

    it('returns 404 when no edition is configured', async () => {
      app = await createApp({ editions: [] });
      const res = await request(app.getHttpServer()).get('/editions/current').expect(404);
      expect(res.body.code).toBe('no_active_edition');
    });
  });

  describe('Discord OAuth', () => {
    it('redirects to Discord with a state that is also stored in an httpOnly cookie', async () => {
      app = await createApp();
      const res = await request(app.getHttpServer()).get('/auth/discord').expect(302);
      const state = new URL(res.headers.location).searchParams.get('state');
      const cookie = cookieNamed(res, 'oauth_state')!;
      expect(state).toMatch(/^[A-Za-z0-9_-]{32,}$/);
      expect(cookie).toContain(`oauth_state=${state}`);
      expect(cookie).toContain('HttpOnly');
    });

    it('rejects a callback whose state does not match the cookie and sets no session', async () => {
      app = await createApp();
      const res = await request(app.getHttpServer())
        .get('/auth/discord/callback?code=good-code&state=forged')
        .set('Cookie', 'oauth_state=original')
        .expect(302);
      expect(res.headers.location).toBe('http://web.test/?auth_error=state');
      expect(cookieNamed(res, 'session')).toBeUndefined();
    });

    it('rejects a callback with no state cookie (expired or never started)', async () => {
      app = await createApp();
      const res = await request(app.getHttpServer())
        .get('/auth/discord/callback?code=good-code&state=x')
        .expect(302);
      expect(res.headers.location).toBe('http://web.test/?auth_error=state');
      expect(cookieNamed(res, 'session')).toBeUndefined();
    });

    it('redirects to the web app with a session when Discord rejects the code', async () => {
      app = await createApp();
      const start = await request(app.getHttpServer()).get('/auth/discord');
      const stateCookie = cookieNamed(start, 'oauth_state')!.split(';')[0];
      const state = new URL(start.headers.location).searchParams.get('state');
      const res = await request(app.getHttpServer())
        .get(`/auth/discord/callback?code=bad-code&state=${state}`)
        .set('Cookie', stateCookie)
        .expect(302);
      expect(res.headers.location).toBe('http://web.test/?auth_error=discord');
      expect(cookieNamed(res, 'session')).toBeUndefined();
    });

    it('signs the user in and redirects back to the web app', async () => {
      app = await createApp();
      const start = await request(app.getHttpServer()).get('/auth/discord');
      const stateCookie = cookieNamed(start, 'oauth_state')!.split(';')[0];
      const state = new URL(start.headers.location).searchParams.get('state');
      const res = await request(app.getHttpServer())
        .get(`/auth/discord/callback?code=good-code&state=${state}`)
        .set('Cookie', stateCookie)
        .expect(302);
      expect(res.headers.location).toBe('http://web.test/');
      const session = cookieNamed(res, 'session')!;
      expect(session).toContain('HttpOnly');
      expect(session).toContain('SameSite=Lax');
      expect(cookieNamed(res, 'oauth_state')).toMatch(/oauth_state=;/);
    });
  });

  describe('GET /me', () => {
    it('returns 401 without a session', async () => {
      app = await createApp();
      await request(app.getHttpServer()).get('/me').expect(401);
    });

    it('returns 401 for a tampered session cookie', async () => {
      app = await createApp();
      await request(app.getHttpServer()).get('/me').set('Cookie', 'session=not-a-jwt').expect(401);
    });

    it('returns the signed-in user and no application yet', async () => {
      app = await createApp();
      const session = await signIn(app);
      const res = await request(app.getHttpServer()).get('/me').set('Cookie', session).expect(200);
      expect(res.body).toEqual({
        user: {
          username: 'kenaii',
          displayName: 'Kenaii',
          avatarUrl: 'https://cdn.discordapp.com/avatars/111/abc.png',
        },
        application: null,
        deletion: null,
      });
    });
  });

  describe('POST /judge-applications', () => {
    it('returns 401 without a session', async () => {
      app = await createApp();
      await request(app.getHttpServer()).post('/judge-applications').send({ consent: true }).expect(401);
    });

    it('returns 400 when consent is missing or false', async () => {
      app = await createApp();
      const session = await signIn(app);
      for (const body of [{}, { consent: false }, { consent: 'yes' }]) {
        const res = await request(app.getHttpServer())
          .post('/judge-applications')
          .set('Cookie', session)
          .send(body)
          .expect(400);
        expect(res.body.code).toBe('consent_required');
      }
    });

    it('creates the application, shows it in /me, and rejects a duplicate with 409', async () => {
      app = await createApp();
      const session = await signIn(app);

      const created = await request(app.getHttpServer())
        .post('/judge-applications')
        .set('Cookie', session)
        .send({ consent: true })
        .expect(201);
      expect(created.body).toEqual({
        editionSlug: 'express-2026',
        consentedAt: '2026-11-25T12:00:00.000Z',
        consentVersion: expect.any(String),
      });

      const me = await request(app.getHttpServer()).get('/me').set('Cookie', session).expect(200);
      expect(me.body.application).toEqual(created.body);

      const dup = await request(app.getHttpServer())
        .post('/judge-applications')
        .set('Cookie', session)
        .send({ consent: true })
        .expect(409);
      expect(dup.body.code).toBe('already_applied');
    });

    it('returns 403 once signup is closed', async () => {
      app = await createApp({ now: new Date('2026-12-02T00:00:00Z') });
      const session = await signIn(app);
      const res = await request(app.getHttpServer())
        .post('/judge-applications')
        .set('Cookie', session)
        .send({ consent: true })
        .expect(403);
      expect(res.body.code).toBe('signup_closed');
    });
  });

  describe('DELETE /judge-applications/current', () => {
    it('returns 401 without a session', async () => {
      app = await createApp();
      await request(app.getHttpServer()).delete('/judge-applications/current').expect(401);
    });

    it('withdraws the application, removes it from /me, and allows applying again', async () => {
      app = await createApp();
      const session = await signIn(app);
      await request(app.getHttpServer()).post('/judge-applications').set('Cookie', session).send({ consent: true }).expect(201);

      const res = await request(app.getHttpServer()).delete('/judge-applications/current').set('Cookie', session).expect(204);
      expect(res.text).toBe('');

      const me = await request(app.getHttpServer()).get('/me').set('Cookie', session).expect(200);
      expect(me.body.application).toBeNull();
      await request(app.getHttpServer()).post('/judge-applications').set('Cookie', session).send({ consent: true }).expect(201);
    });

    it('returns 404 not_applied when there is nothing to withdraw', async () => {
      app = await createApp();
      const session = await signIn(app);
      const res = await request(app.getHttpServer()).delete('/judge-applications/current').set('Cookie', session).expect(404);
      expect(res.body.code).toBe('not_applied');
    });

    it('returns 403 signup_closed once signup is closed', async () => {
      app = await createApp({ now: new Date('2026-12-02T00:00:00Z') });
      const session = await signIn(app);
      const res = await request(app.getHttpServer()).delete('/judge-applications/current').set('Cookie', session).expect(403);
      expect(res.body.code).toBe('signup_closed');
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the session cookie', async () => {
      app = await createApp();
      const session = await signIn(app);
      const res = await request(app.getHttpServer()).post('/auth/logout').set('Cookie', session).expect(204);
      expect(cookieNamed(res, 'session')).toMatch(/session=;/);
    });
  });
});

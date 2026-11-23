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

const CRON_SECRET = 'cron-secret-that-is-at-least-32-characters';
const DAY = 86_400_000;
const config: AppConfig = {
  webUrl: 'http://web.test',
  sessionSecret: 'test-session-secret-that-is-at-least-32-chars',
  cookieSecure: false,
  trustProxy: false,
  proxySecret: null,
  cronSecret: CRON_SECRET,
  discord: { clientId: 'cid', clientSecret: 'secret', redirectUri: 'http://web.test/api/auth/discord/callback' },
};
const edition = {
  id: 'edition-1',
  slug: 'express-2026',
  name: 'Express 2026',
  signupOpensAt: new Date('2026-11-20T00:00:00Z'),
  signupClosesAt: new Date('2026-12-31T00:00:00Z'),
};

async function createApp(overrides: Partial<AppConfig> = {}) {
  let now = new Date('2026-11-25T12:00:00Z');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG).useValue({ ...config, ...overrides })
    .overrideProvider(DISCORD_OAUTH).useValue(new FakeDiscordOAuth({ 'good-code': { id: '111', username: 'kenaii', globalName: 'Kenaii', avatar: null } }))
    .overrideProvider(USER_REPOSITORY).useValue(new InMemoryUserRepository())
    .overrideProvider(EDITION_REPOSITORY).useValue(new InMemoryEditionRepository([edition]))
    .overrideProvider(JUDGE_APPLICATION_REPOSITORY).useValue(new InMemoryJudgeApplicationRepository())
    .overrideProvider(CLOCK).useValue({ now: () => now })
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, advance: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

async function signIn(app: INestApplication): Promise<string> {
  const server = app.getHttpServer();
  const start = await request(server).get('/auth/discord');
  const state = new URL(start.headers.location).searchParams.get('state');
  const stateCookie = (start.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('oauth_state='))!.split(';')[0];
  const callback = await request(server).get(`/auth/discord/callback?code=good-code&state=${state}`).set('Cookie', stateCookie);
  return (callback.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('session='))!.split(';')[0];
}

describe('Account deletion (e2e)', () => {
  let app: INestApplication;
  afterEach(async () => app?.close());

  it('requires a session to request or cancel deletion', async () => {
    ({ app } = await createApp());
    await request(app.getHttpServer()).post('/me/deletion').expect(401);
    await request(app.getHttpServer()).delete('/me/deletion').expect(401);
  });

  it('schedules deletion a week later, shows it in /me, and can be cancelled', async () => {
    ({ app } = await createApp());
    const server = app.getHttpServer();
    const session = await signIn(app);

    const requested = await request(server).post('/me/deletion').set('Cookie', session).expect(202);
    expect(requested.body).toEqual({ scheduledFor: '2026-12-02T12:00:00.000Z' });
    const me = await request(server).get('/me').set('Cookie', session).expect(200);
    expect(me.body.deletion).toEqual({ scheduledFor: '2026-12-02T12:00:00.000Z' });

    await request(server).delete('/me/deletion').set('Cookie', session).expect(204);
    const after = await request(server).get('/me').set('Cookie', session).expect(200);
    expect(after.body.deletion).toBeNull();
  });

  it('refuses the purge without the cron secret', async () => {
    ({ app } = await createApp());
    const server = app.getHttpServer();
    await request(server).get('/internal/purge-deleted-accounts').expect(401);
    await request(server).get('/internal/purge-deleted-accounts').set('Authorization', 'Bearer wrong').expect(401);
  });

  it('keeps the purge disabled when no CRON_SECRET is configured, whatever is sent', async () => {
    ({ app } = await createApp({ cronSecret: null }));
    const server = app.getHttpServer();
    await request(server).get('/internal/purge-deleted-accounts').set('Authorization', 'Bearer ').expect(401);
    await request(server).get('/internal/purge-deleted-accounts').set('Authorization', 'Bearer null').expect(401);
  });

  it('deletes the account and its application once the grace period is over', async () => {
    let advance: (ms: number) => Date;
    ({ app, advance } = await createApp());
    const server = app.getHttpServer();
    const session = await signIn(app);
    await request(server).post('/judge-applications').set('Cookie', session).send({ consent: true }).expect(201);
    await request(server).post('/me/deletion').set('Cookie', session).expect(202);
    const auth = { Authorization: `Bearer ${CRON_SECRET}` };

    advance(6 * DAY);
    expect((await request(server).get('/internal/purge-deleted-accounts').set(auth).expect(200)).body).toEqual({ deleted: 0 });
    await request(server).get('/me').set('Cookie', session).expect(200);

    advance(1 * DAY);
    expect((await request(server).get('/internal/purge-deleted-accounts').set(auth).expect(200)).body).toEqual({ deleted: 1 });

    // The old session no longer works, and using it fails cleanly (not a 500).
    await request(server).get('/me').set('Cookie', session).expect(401);
    const apply = await request(server).post('/judge-applications').set('Cookie', session).send({ consent: true }).expect(401);
    expect(apply.body.code).toBe('unauthenticated');
    const again = await request(server).post('/me/deletion').set('Cookie', session).expect(401);
    expect(again.body.code).toBe('unauthenticated');
  });
});

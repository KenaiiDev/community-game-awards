import { PrismaService } from '../src/prisma/prisma.service.js';
import { PrismaUserRepository } from '../src/auth/infrastructure/prisma-user.repository.js';
import { PrismaEditionRepository } from '../src/judge-applications/infrastructure/prisma-edition.repository.js';
import { PrismaJudgeApplicationRepository } from '../src/judge-applications/infrastructure/prisma-judge-application.repository.js';
import { AlreadyAppliedError } from '../src/judge-applications/domain/errors.js';
import { upsertEdition } from '../src/judge-applications/infrastructure/upsert-edition.js';

const prisma = new PrismaService();
const users = new PrismaUserRepository(prisma);
const editions = new PrismaEditionRepository(prisma);
const applications = new PrismaJudgeApplicationRepository(prisma);

const discordUser = { discordId: '111', username: 'kenaii', displayName: 'Kenaii', avatarUrl: null };

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE "JudgeApplication", "User", "Edition" CASCADE');
});
afterAll(async () => prisma.$disconnect());

describe('Prisma repositories', () => {
  it('upserts users by Discord id', async () => {
    const created = await users.upsertByDiscordId(discordUser);
    const updated = await users.upsertByDiscordId({ ...discordUser, username: 'renamed' });

    expect(updated.id).toBe(created.id);
    expect(await users.findByDiscordId('111')).toMatchObject({ username: 'renamed' });
    expect(await prisma.user.count()).toBe(1);
  });

  it('treats the edition whose signup opened most recently as active', async () => {
    await upsertEdition(prisma, {
      slug: 'old', name: 'Old', signupOpensAt: new Date('2025-10-01Z'), signupClosesAt: new Date('2025-11-01Z'),
    });
    await upsertEdition(prisma, {
      slug: 'express-2026', name: 'Express', signupOpensAt: new Date('2026-11-20Z'), signupClosesAt: new Date('2026-12-01Z'),
    });

    expect(await editions.findActive()).toMatchObject({ slug: 'express-2026' });
  });

  it('updates an existing edition by slug instead of duplicating it', async () => {
    const base = { slug: 'express-2026', name: 'Express', signupOpensAt: new Date('2026-11-20Z') };
    await upsertEdition(prisma, { ...base, signupClosesAt: new Date('2026-12-01Z') });
    await upsertEdition(prisma, { ...base, signupClosesAt: new Date('2026-12-10Z') });

    expect(await prisma.edition.count()).toBe(1);
    expect((await editions.findActive())?.signupClosesAt).toEqual(new Date('2026-12-10Z'));
  });

  it('enforces one application per user and edition at the database level, even concurrently', async () => {
    const user = await users.upsertByDiscordId(discordUser);
    const edition = await upsertEdition(prisma, {
      slug: 'e', name: 'E', signupOpensAt: new Date('2026-11-20Z'), signupClosesAt: new Date('2026-12-01Z'),
    });
    const data = { userId: user.id, editionId: edition.id, consentedAt: new Date(), consentVersion: 'v1' };

    const results = await Promise.allSettled([applications.create(data), applications.create(data)]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(AlreadyAppliedError);
    expect(await applications.findByUserAndEdition(user.id, edition.id)).toMatchObject({ consentVersion: 'v1' });
  });
});

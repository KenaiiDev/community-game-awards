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

  describe('active edition selection', () => {
    beforeEach(async () => {
      await upsertEdition(prisma, {
        slug: 'old', name: 'Old', signupOpensAt: new Date('2025-10-01Z'), signupClosesAt: new Date('2025-11-01Z'),
      });
      await upsertEdition(prisma, {
        slug: 'express-2026', name: 'Express', signupOpensAt: new Date('2026-11-20Z'), signupClosesAt: new Date('2026-12-01Z'),
      });
      await upsertEdition(prisma, {
        slug: 'next-2027', name: 'Next', signupOpensAt: new Date('2027-09-01Z'), signupClosesAt: new Date('2027-10-01Z'),
      });
    });

    it('prefers the edition whose signup has already opened, even if a future one exists', async () => {
      expect(await editions.findActive(new Date('2026-11-25Z'))).toMatchObject({ slug: 'express-2026' });
    });

    it('keeps the last opened edition active after its signup closes', async () => {
      expect(await editions.findActive(new Date('2027-01-15Z'))).toMatchObject({ slug: 'express-2026' });
    });

    it('falls back to the soonest upcoming edition when none has opened yet', async () => {
      expect(await editions.findActive(new Date('2025-01-01Z'))).toMatchObject({ slug: 'old' });
    });
  });

  it('updates an existing edition by slug instead of duplicating it', async () => {
    const base = { slug: 'express-2026', name: 'Express', signupOpensAt: new Date('2026-11-20Z') };
    await upsertEdition(prisma, { ...base, signupClosesAt: new Date('2026-12-01Z') });
    await upsertEdition(prisma, { ...base, signupClosesAt: new Date('2026-12-10Z') });

    expect(await prisma.edition.count()).toBe(1);
    expect((await editions.findActive(new Date("2026-11-25Z")))?.signupClosesAt).toEqual(new Date('2026-12-10Z'));
  });

  it('deletes only the given user\'s application and reports whether one existed', async () => {
    const user = await users.upsertByDiscordId(discordUser);
    const other = await users.upsertByDiscordId({ ...discordUser, discordId: '222', username: 'other' });
    const edition = await upsertEdition(prisma, {
      slug: 'e', name: 'E', signupOpensAt: new Date('2026-11-20Z'), signupClosesAt: new Date('2026-12-01Z'),
    });
    const base = { editionId: edition.id, consentedAt: new Date(), consentVersion: 'v1' };
    await applications.create({ ...base, userId: user.id });
    await applications.create({ ...base, userId: other.id });

    expect(await applications.delete(user.id, edition.id)).toBe(true);
    expect(await applications.delete(user.id, edition.id)).toBe(false);
    expect(await applications.findByUserAndEdition(user.id, edition.id)).toBeNull();
    expect(await applications.findByUserAndEdition(other.id, edition.id)).not.toBeNull();
    // The user account itself is kept; only the application is withdrawn.
    expect(await prisma.user.count()).toBe(2);
  });

  describe('account deletion', () => {
    it('flags, keeps the flag on a new sign-in, and cancels', async () => {
      const user = await users.upsertByDiscordId(discordUser);
      const at = new Date('2026-11-25T12:00:00Z');

      expect(await users.requestDeletion(user.id, at)).toEqual(at);
      expect(await users.requestDeletion(user.id, new Date('2026-11-28Z'))).toEqual(at);
      await users.upsertByDiscordId({ ...discordUser, displayName: 'Renamed' });
      expect((await users.findById(user.id))?.deletionRequestedAt).toEqual(at);

      await users.cancelDeletion(user.id);
      expect((await users.findById(user.id))?.deletionRequestedAt).toBeNull();
    });

    it('purges due accounts together with their applications and nothing else', async () => {
      const due = await users.upsertByDiscordId(discordUser);
      const recent = await users.upsertByDiscordId({ ...discordUser, discordId: '222' });
      const kept = await users.upsertByDiscordId({ ...discordUser, discordId: '333' });
      const edition = await upsertEdition(prisma, {
        slug: 'e', name: 'E', signupOpensAt: new Date('2026-11-20Z'), signupClosesAt: new Date('2026-12-01Z'),
      });
      for (const u of [due, recent, kept]) {
        await applications.create({ userId: u.id, editionId: edition.id, consentedAt: new Date(), consentVersion: 'v1' });
      }
      await users.requestDeletion(due.id, new Date('2026-11-18Z'));
      await users.requestDeletion(recent.id, new Date('2026-11-24Z'));

      expect(await users.purgeDeletionsRequestedBefore(new Date('2026-11-18Z'))).toBe(1);

      expect(await users.findById(due.id)).toBeNull();
      expect(await prisma.judgeApplication.count({ where: { userId: due.id } })).toBe(0);
      expect(await users.findById(recent.id)).not.toBeNull();
      expect(await users.findById(kept.id)).not.toBeNull();
      expect(await prisma.judgeApplication.count()).toBe(2);
    });
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

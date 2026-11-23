import { WithdrawApplication } from './withdraw-application.use-case.js';
import { NoActiveEditionError, NotAppliedError, SignupClosedError } from '../domain/errors.js';
import { InMemoryEditionRepository } from '../infrastructure/in-memory-edition.repository.js';
import { InMemoryJudgeApplicationRepository } from '../infrastructure/in-memory-judge-application.repository.js';
import type { Edition } from '../domain/edition.js';

const edition: Edition = {
  id: 'edition-1',
  slug: 'express-2026',
  name: 'Express 2026',
  signupOpensAt: new Date('2026-11-20T00:00:00Z'),
  signupClosesAt: new Date('2026-12-01T00:00:00Z'),
};

async function setup(now: Date, { applied = true, editions = [edition] } = {}) {
  const applications = new InMemoryJudgeApplicationRepository();
  if (applied) {
    await applications.create({ userId: 'user-1', editionId: edition.id, consentedAt: now, consentVersion: 'v1' });
  }
  const useCase = new WithdrawApplication(new InMemoryEditionRepository(editions), applications, { now: () => now });
  return { useCase, applications };
}

describe('WithdrawApplication', () => {
  const insideWindow = new Date('2026-11-25T12:00:00Z');

  it('deletes the application while signup is open', async () => {
    const { useCase, applications } = await setup(insideWindow);

    await useCase.execute({ userId: 'user-1' });

    expect(await applications.findByUserAndEdition('user-1', edition.id)).toBeNull();
  });

  it("leaves other people's applications untouched", async () => {
    const { useCase, applications } = await setup(insideWindow);
    await applications.create({ userId: 'user-2', editionId: edition.id, consentedAt: insideWindow, consentVersion: 'v1' });

    await useCase.execute({ userId: 'user-1' });

    expect(await applications.findByUserAndEdition('user-2', edition.id)).not.toBeNull();
  });

  it('rejects withdrawing when there is no application', async () => {
    const { useCase } = await setup(insideWindow, { applied: false });
    await expect(useCase.execute({ userId: 'user-1' })).rejects.toBeInstanceOf(NotAppliedError);
  });

  it('refuses once signup has closed and keeps the application', async () => {
    const afterClose = new Date('2026-12-01T00:00:00Z');
    const { useCase, applications } = await setup(afterClose);

    await expect(useCase.execute({ userId: 'user-1' })).rejects.toBeInstanceOf(SignupClosedError);
    expect(await applications.findByUserAndEdition('user-1', edition.id)).not.toBeNull();
  });

  it('rejects when there is no active edition', async () => {
    const { useCase } = await setup(insideWindow, { applied: false, editions: [] });
    await expect(useCase.execute({ userId: 'user-1' })).rejects.toBeInstanceOf(NoActiveEditionError);
  });
});

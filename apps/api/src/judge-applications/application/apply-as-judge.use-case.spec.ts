import { ApplyAsJudge } from './apply-as-judge.use-case.js';
import {
  AlreadyAppliedError,
  ConsentRequiredError,
  NoActiveEditionError,
  SignupClosedError,
  SignupNotOpenError,
} from '../domain/errors.js';
import { InMemoryEditionRepository } from '../infrastructure/in-memory-edition.repository.js';
import { InMemoryJudgeApplicationRepository } from '../infrastructure/in-memory-judge-application.repository.js';
import type { Edition } from '../domain/edition.js';
import { CONSENT_VERSION } from '../domain/consent.js';

const edition: Edition = {
  id: 'edition-1',
  slug: 'express-2026',
  name: 'Express 2026',
  signupOpensAt: new Date('2026-11-20T00:00:00Z'),
  signupClosesAt: new Date('2026-12-01T00:00:00Z'),
};

function setup(now: Date, editions: Edition[] = [edition]) {
  const applications = new InMemoryJudgeApplicationRepository();
  const useCase = new ApplyAsJudge(
    new InMemoryEditionRepository(editions),
    applications,
    { now: () => now },
  );
  return { useCase, applications };
}

describe('ApplyAsJudge', () => {
  const insideWindow = new Date('2026-11-25T12:00:00Z');

  it('stores the application with consent timestamp and version', async () => {
    const { useCase, applications } = setup(insideWindow);

    const result = await useCase.execute({ userId: 'user-1', consent: true });

    expect(result).toEqual({
      id: expect.any(String),
      userId: 'user-1',
      editionId: 'edition-1',
      consentedAt: insideWindow,
      consentVersion: CONSENT_VERSION,
    });
    expect(await applications.findByUserAndEdition('user-1', 'edition-1')).toEqual(result);
  });

  it('rejects an application without explicit consent', async () => {
    const { useCase, applications } = setup(insideWindow);

    await expect(useCase.execute({ userId: 'user-1', consent: false })).rejects.toBeInstanceOf(
      ConsentRequiredError,
    );
    expect(await applications.findByUserAndEdition('user-1', 'edition-1')).toBeNull();
  });

  it('rejects a second application from the same user in the same edition', async () => {
    const { useCase } = setup(insideWindow);
    await useCase.execute({ userId: 'user-1', consent: true });

    await expect(useCase.execute({ userId: 'user-1', consent: true })).rejects.toBeInstanceOf(
      AlreadyAppliedError,
    );
  });

  it('rejects applications before signup opens', async () => {
    const { useCase } = setup(new Date('2026-11-19T23:59:59Z'));

    await expect(useCase.execute({ userId: 'user-1', consent: true })).rejects.toBeInstanceOf(
      SignupNotOpenError,
    );
  });

  it('rejects applications at or after the signup deadline (UTC)', async () => {
    const { useCase } = setup(new Date('2026-12-01T00:00:00Z'));

    await expect(useCase.execute({ userId: 'user-1', consent: true })).rejects.toBeInstanceOf(
      SignupClosedError,
    );
  });

  it('fails when there is no active edition', async () => {
    const { useCase } = setup(insideWindow, []);

    await expect(useCase.execute({ userId: 'user-1', consent: true })).rejects.toBeInstanceOf(
      NoActiveEditionError,
    );
  });
});

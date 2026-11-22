import { CONSENT_VERSION } from '../domain/consent.js';
import { signupStatus } from '../domain/edition.js';
import {
  AlreadyAppliedError,
  ConsentRequiredError,
  NoActiveEditionError,
  SignupClosedError,
  SignupNotOpenError,
} from '../domain/errors.js';
import type { JudgeApplication } from '../domain/judge-application.js';
import type { Clock, EditionRepository, JudgeApplicationRepository } from './ports.js';

export interface ApplyAsJudgeCommand {
  userId: string;
  consent: boolean;
}

export class ApplyAsJudge {
  constructor(
    private readonly editions: EditionRepository,
    private readonly applications: JudgeApplicationRepository,
    private readonly clock: Clock,
  ) {}

  async execute({ userId, consent }: ApplyAsJudgeCommand): Promise<JudgeApplication> {
    if (consent !== true) throw new ConsentRequiredError();

    const now = this.clock.now();
    const edition = await this.editions.findActive(now);
    if (!edition) throw new NoActiveEditionError();

    const status = signupStatus(edition, now);
    if (status === 'not_open') throw new SignupNotOpenError();
    if (status === 'closed') throw new SignupClosedError();

    if (await this.applications.findByUserAndEdition(userId, edition.id)) {
      throw new AlreadyAppliedError();
    }

    return this.applications.create({
      userId,
      editionId: edition.id,
      consentedAt: now,
      consentVersion: CONSENT_VERSION,
    });
  }
}

import { signupStatus } from '../domain/edition.js';
import { NoActiveEditionError, NotAppliedError, SignupClosedError } from '../domain/errors.js';
import type { Clock, EditionRepository, JudgeApplicationRepository } from './ports.js';

/**
 * A judge can change their mind while signup is open. After it closes the draw
 * depends on the list, so withdrawing is refused (deleting the whole account is
 * still possible from the account screen).
 */
export class WithdrawApplication {
  constructor(
    private readonly editions: EditionRepository,
    private readonly applications: JudgeApplicationRepository,
    private readonly clock: Clock,
  ) {}

  async execute({ userId }: { userId: string }): Promise<void> {
    const now = this.clock.now();
    const edition = await this.editions.findActive(now);
    if (!edition) throw new NoActiveEditionError();
    if (signupStatus(edition, now) === 'closed') throw new SignupClosedError();
    if (!(await this.applications.delete(userId, edition.id))) throw new NotAppliedError();
  }
}

import type { UserRepository } from '../../auth/application/ports.js';
import type { Clock } from '../../judge-applications/application/ports.js';
import { deletionCutoff, deletionScheduledFor } from '../domain/account-deletion.js';

/** Schedules the deletion of all of a user's data after the grace period. */
export class RequestAccountDeletion {
  constructor(
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  /** Resolves null when the account no longer exists. */
  async execute({ userId }: { userId: string }): Promise<{ scheduledFor: Date } | null> {
    // Asking again keeps the first request, so the date never moves further away.
    const requestedAt = await this.users.requestDeletion(userId, this.clock.now());
    return requestedAt && { scheduledFor: deletionScheduledFor(requestedAt) };
  }
}

/** The user changed their mind during the grace period. */
export class CancelAccountDeletion {
  constructor(private readonly users: UserRepository) {}

  async execute({ userId }: { userId: string }): Promise<void> {
    await this.users.cancelDeletion(userId);
  }
}

/** Run daily: deletes every account whose grace period is over, with its applications. */
export class PurgeDeletedAccounts {
  constructor(
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  execute(): Promise<number> {
    return this.users.purgeDeletionsRequestedBefore(deletionCutoff(this.clock.now()));
  }
}

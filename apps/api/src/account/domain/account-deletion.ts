export const DELETION_GRACE_DAYS = 7;
const DAY_MS = 86_400_000;

/** When a deletion requested at `requestedAt` is carried out. */
export function deletionScheduledFor(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + DELETION_GRACE_DAYS * DAY_MS);
}

/** Requests at or before this instant have completed their grace period at `now`. */
export function deletionCutoff(now: Date): Date {
  return new Date(now.getTime() - DELETION_GRACE_DAYS * DAY_MS);
}

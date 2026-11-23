import { CancelAccountDeletion, PurgeDeletedAccounts, RequestAccountDeletion } from './account-deletion.use-cases.js';
import { DELETION_GRACE_DAYS } from '../domain/account-deletion.js';
import { InMemoryUserRepository } from '../../auth/infrastructure/in-memory-user.repository.js';

const DAY = 86_400_000;
const discordUser = { discordId: '111', username: 'kenaii', displayName: 'Kenaii', avatarUrl: null };

async function setup() {
  const users = new InMemoryUserRepository();
  const user = await users.upsertByDiscordId(discordUser);
  let now = new Date('2026-11-25T12:00:00Z');
  const clock = { now: () => now };
  return { users, user, clock, advance: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

describe('account deletion', () => {
  it('gives a one-week grace period', () => {
    expect(DELETION_GRACE_DAYS).toBe(7);
  });

  it('schedules deletion a week after the request', async () => {
    const { users, user, clock } = await setup();

    const { scheduledFor } = await new RequestAccountDeletion(users, clock).execute({ userId: user.id });

    expect(scheduledFor).toEqual(new Date('2026-12-02T12:00:00Z'));
    expect((await users.findById(user.id))?.deletionRequestedAt).toEqual(clock.now());
  });

  it('keeps the original date when deletion is requested again', async () => {
    const { users, user, clock, advance } = await setup();
    await new RequestAccountDeletion(users, clock).execute({ userId: user.id });
    advance(3 * DAY);

    const { scheduledFor } = await new RequestAccountDeletion(users, clock).execute({ userId: user.id });

    expect(scheduledFor).toEqual(new Date('2026-12-02T12:00:00Z'));
  });

  it('cancels a pending deletion', async () => {
    const { users, user, clock } = await setup();
    await new RequestAccountDeletion(users, clock).execute({ userId: user.id });

    await new CancelAccountDeletion(users).execute({ userId: user.id });

    expect((await users.findById(user.id))?.deletionRequestedAt).toBeNull();
  });

  it('does not cancel a pending deletion just because the user signs in again', async () => {
    const { users, user, clock } = await setup();
    await new RequestAccountDeletion(users, clock).execute({ userId: user.id });

    await users.upsertByDiscordId({ ...discordUser, displayName: 'Renamed' });

    expect((await users.findById(user.id))?.deletionRequestedAt).toEqual(clock.now());
  });

  it('purges only accounts whose grace period is over', async () => {
    const { users, user, clock, advance } = await setup();
    const other = await users.upsertByDiscordId({ ...discordUser, discordId: '222' });
    await new RequestAccountDeletion(users, clock).execute({ userId: user.id });
    advance(2 * DAY);
    await new RequestAccountDeletion(users, clock).execute({ userId: other.id });

    advance(5 * DAY); // first request: exactly 7 days ago; second: 5 days ago
    const purged = await new PurgeDeletedAccounts(users, clock).execute();

    expect(purged).toBe(1);
    expect(await users.findById(user.id)).toBeNull();
    expect(await users.findById(other.id)).not.toBeNull();
  });
});

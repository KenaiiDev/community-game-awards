import { SignInWithDiscord } from './sign-in-with-discord.use-case.js';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository.js';
import { FakeDiscordOAuth } from '../infrastructure/fake-discord-oauth.js';

describe('SignInWithDiscord', () => {
  it('creates a user from the Discord profile on first sign-in', async () => {
    const users = new InMemoryUserRepository();
    const discord = new FakeDiscordOAuth({
      'code-1': { id: '111', username: 'kenaii', globalName: 'Kenaii', avatar: 'abc' },
    });

    const user = await new SignInWithDiscord(discord, users).execute('code-1');

    expect(user).toEqual({
      id: expect.any(String),
      discordId: '111',
      username: 'kenaii',
      displayName: 'Kenaii',
      avatarUrl: 'https://cdn.discordapp.com/avatars/111/abc.png',
      deletionRequestedAt: null,
    });
    expect(await users.findById(user.id)).toEqual(user);
  });

  it('updates the same user on later sign-ins instead of creating a duplicate', async () => {
    const users = new InMemoryUserRepository();
    const discord = new FakeDiscordOAuth({
      first: { id: '111', username: 'old', globalName: null, avatar: null },
      second: { id: '111', username: 'new', globalName: 'New', avatar: 'xyz' },
    });
    const signIn = new SignInWithDiscord(discord, users);

    const first = await signIn.execute('first');
    const second = await signIn.execute('second');

    expect(second.id).toBe(first.id);
    expect(second).toMatchObject({ username: 'new', displayName: 'New' });
  });

  it('falls back to the username when the Discord profile has no display name or avatar', async () => {
    const users = new InMemoryUserRepository();
    const discord = new FakeDiscordOAuth({
      c: { id: '222', username: 'plain', globalName: null, avatar: null },
    });

    const user = await new SignInWithDiscord(discord, users).execute('c');

    expect(user).toMatchObject({ displayName: 'plain', avatarUrl: null });
  });

  it('propagates a failed code exchange without creating a user', async () => {
    const users = new InMemoryUserRepository();
    const signIn = new SignInWithDiscord(new FakeDiscordOAuth({}), users);

    await expect(signIn.execute('bad-code')).rejects.toThrow('invalid_grant');
    expect(await users.findByDiscordId('111')).toBeNull();
  });
});

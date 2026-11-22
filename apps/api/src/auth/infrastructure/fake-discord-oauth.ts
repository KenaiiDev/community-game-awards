import type { DiscordOAuth } from '../application/ports.js';
import type { DiscordProfile } from '../domain/user.js';

/** Test double: maps authorization codes to Discord profiles. */
export class FakeDiscordOAuth implements DiscordOAuth {
  constructor(private readonly profilesByCode: Record<string, DiscordProfile>) {}

  authorizeUrl(state: string): string {
    return `https://discord.test/oauth2/authorize?state=${encodeURIComponent(state)}`;
  }

  async exchangeCode(code: string): Promise<DiscordProfile> {
    const profile = this.profilesByCode[code];
    if (!profile) throw new Error('invalid_grant');
    return profile;
  }
}

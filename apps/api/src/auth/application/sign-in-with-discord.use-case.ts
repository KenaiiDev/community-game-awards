import { userDataFromDiscord, type User } from '../domain/user.js';
import type { DiscordOAuth, UserRepository } from './ports.js';

export class SignInWithDiscord {
  constructor(
    private readonly discord: DiscordOAuth,
    private readonly users: UserRepository,
  ) {}

  async execute(code: string): Promise<User> {
    const profile = await this.discord.exchangeCode(code);
    return this.users.upsertByDiscordId(userDataFromDiscord(profile));
  }
}

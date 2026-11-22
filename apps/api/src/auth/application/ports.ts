import type { DiscordProfile, User } from '../domain/user.js';

export interface DiscordOAuth {
  authorizeUrl(state: string): string;
  /** Exchanges an authorization code for the signed-in Discord profile. */
  exchangeCode(code: string): Promise<DiscordProfile>;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByDiscordId(discordId: string): Promise<User | null>;
  upsertByDiscordId(data: Omit<User, 'id'>): Promise<User>;
}

export interface SessionTokens {
  sign(userId: string): Promise<string>;
  /** Returns the user id, or null for a missing, expired or tampered token. */
  verify(token: string): Promise<string | null>;
}

export const DISCORD_OAUTH = Symbol('DiscordOAuth');
export const USER_REPOSITORY = Symbol('UserRepository');
export const SESSION_TOKENS = Symbol('SessionTokens');

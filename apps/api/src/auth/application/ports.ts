import type { DiscordProfile, DiscordUserData, User } from '../domain/user.js';

export interface DiscordOAuth {
  authorizeUrl(state: string): string;
  /** Exchanges an authorization code for the signed-in Discord profile. */
  exchangeCode(code: string): Promise<DiscordProfile>;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByDiscordId(discordId: string): Promise<User | null>;
  upsertByDiscordId(data: DiscordUserData): Promise<User>;
  /** Flags the user for deletion unless already flagged; resolves the effective request time, or null if the user is gone. */
  requestDeletion(id: string, at: Date): Promise<Date | null>;
  cancelDeletion(id: string): Promise<void>;
  /** Deletes users flagged at or before `cutoff`, with their applications; resolves the count. */
  purgeDeletionsRequestedBefore(cutoff: Date): Promise<number>;
}

export interface SessionTokens {
  sign(userId: string): Promise<string>;
  /** Returns the user id, or null for a missing, expired or tampered token. */
  verify(token: string): Promise<string | null>;
}

export const DISCORD_OAUTH = Symbol('DiscordOAuth');
export const USER_REPOSITORY = Symbol('UserRepository');
export const SESSION_TOKENS = Symbol('SessionTokens');

import { randomUUID } from 'node:crypto';
import type { UserRepository } from '../application/ports.js';
import type { DiscordUserData, User } from '../domain/user.js';

export class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];

  async findById(id: string) {
    const user = this.users.find((u) => u.id === id);
    return user ? { ...user } : null;
  }

  async findByDiscordId(discordId: string) {
    const user = this.users.find((u) => u.discordId === discordId);
    return user ? { ...user } : null;
  }

  async upsertByDiscordId(data: DiscordUserData) {
    const existing = this.users.find((u) => u.discordId === data.discordId);
    if (existing) {
      Object.assign(existing, data);
      return { ...existing };
    }
    const user = { id: randomUUID(), ...data, deletionRequestedAt: null };
    this.users.push(user);
    return { ...user };
  }

  async requestDeletion(id: string, at: Date) {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new Error(`Unknown user ${id}`);
    user.deletionRequestedAt ??= at;
    return user.deletionRequestedAt;
  }

  async cancelDeletion(id: string) {
    const user = this.users.find((u) => u.id === id);
    if (user) user.deletionRequestedAt = null;
  }

  async purgeDeletionsRequestedBefore(cutoff: Date) {
    const before = this.users.length;
    this.users = this.users.filter((u) => !u.deletionRequestedAt || u.deletionRequestedAt > cutoff);
    return before - this.users.length;
  }
}

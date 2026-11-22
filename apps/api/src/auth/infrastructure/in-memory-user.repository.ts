import { randomUUID } from 'node:crypto';
import type { UserRepository } from '../application/ports.js';
import type { User } from '../domain/user.js';

export class InMemoryUserRepository implements UserRepository {
  private readonly users: User[] = [];

  async findById(id: string) {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findByDiscordId(discordId: string) {
    return this.users.find((u) => u.discordId === discordId) ?? null;
  }

  async upsertByDiscordId(data: Omit<User, 'id'>) {
    const existing = await this.findByDiscordId(data.discordId);
    if (existing) {
      Object.assign(existing, data);
      return { ...existing };
    }
    const user = { id: randomUUID(), ...data };
    this.users.push(user);
    return { ...user };
  }
}

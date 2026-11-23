import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UserRepository } from '../application/ports.js';
import type { DiscordUserData, User } from '../domain/user.js';

const select = {
  id: true,
  discordId: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  deletionRequestedAt: true,
};

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id }, select });
  }

  findByDiscordId(discordId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { discordId }, select });
  }

  upsertByDiscordId(data: DiscordUserData): Promise<User> {
    return this.prisma.user.upsert({
      where: { discordId: data.discordId },
      create: data,
      update: data,
      select,
    });
  }

  async requestDeletion(id: string, at: Date): Promise<Date | null> {
    // Only sets the flag when it is not set yet, so the first request wins. A user
    // purged in between simply reads back as missing.
    await this.prisma.user.updateMany({ where: { id, deletionRequestedAt: null }, data: { deletionRequestedAt: at } });
    const user = await this.prisma.user.findUnique({ where: { id }, select: { deletionRequestedAt: true } });
    return user?.deletionRequestedAt ?? null;
  }

  async cancelDeletion(id: string): Promise<void> {
    await this.prisma.user.updateMany({ where: { id }, data: { deletionRequestedAt: null } });
  }

  async purgeDeletionsRequestedBefore(cutoff: Date): Promise<number> {
    // Applications go with the user (ON DELETE CASCADE).
    const { count } = await this.prisma.user.deleteMany({ where: { deletionRequestedAt: { lte: cutoff } } });
    return count;
  }
}

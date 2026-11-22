import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UserRepository } from '../application/ports.js';
import type { User } from '../domain/user.js';

const select = { id: true, discordId: true, username: true, displayName: true, avatarUrl: true };

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id }, select });
  }

  findByDiscordId(discordId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { discordId }, select });
  }

  upsertByDiscordId(data: Omit<User, 'id'>): Promise<User> {
    return this.prisma.user.upsert({
      where: { discordId: data.discordId },
      create: data,
      update: data,
      select,
    });
  }
}

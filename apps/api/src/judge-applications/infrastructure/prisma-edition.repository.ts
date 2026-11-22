import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { EditionRepository } from '../application/ports.js';
import type { Edition } from '../domain/edition.js';

const select = { id: true, slug: true, name: true, signupOpensAt: true, signupClosesAt: true };

@Injectable()
export class PrismaEditionRepository implements EditionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The active edition is the latest one whose signup has already opened, so
   * creating next year's edition early never hides the current one. Before any
   * edition opens, the soonest upcoming one is active.
   */
  async findActive(now: Date): Promise<Edition | null> {
    const opened = await this.prisma.edition.findFirst({
      where: { signupOpensAt: { lte: now } },
      orderBy: { signupOpensAt: 'desc' },
      select,
    });
    if (opened) return opened;
    return this.prisma.edition.findFirst({ orderBy: { signupOpensAt: 'asc' }, select });
  }
}

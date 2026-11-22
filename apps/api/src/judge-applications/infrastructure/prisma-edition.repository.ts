import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { EditionRepository } from '../application/ports.js';
import type { Edition } from '../domain/edition.js';

@Injectable()
export class PrismaEditionRepository implements EditionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The active edition is the one whose signup opened most recently. */
  findActive(): Promise<Edition | null> {
    return this.prisma.edition.findFirst({
      orderBy: { signupOpensAt: 'desc' },
      select: { id: true, slug: true, name: true, signupOpensAt: true, signupClosesAt: true },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JudgeApplicationRepository } from '../application/ports.js';
import { AlreadyAppliedError } from '../domain/errors.js';
import type { JudgeApplication } from '../domain/judge-application.js';

const select = { id: true, userId: true, editionId: true, consentedAt: true, consentVersion: true };

@Injectable()
export class PrismaJudgeApplicationRepository implements JudgeApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserAndEdition(userId: string, editionId: string): Promise<JudgeApplication | null> {
    return this.prisma.judgeApplication.findUnique({
      where: { userId_editionId: { userId, editionId } },
      select,
    });
  }

  async create(data: Omit<JudgeApplication, 'id'>): Promise<JudgeApplication> {
    try {
      return await this.prisma.judgeApplication.create({ data, select });
    } catch (error) {
      // The unique (userId, editionId) index is the source of truth under concurrent submits.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AlreadyAppliedError();
      }
      throw error;
    }
  }
}

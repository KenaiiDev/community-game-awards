import { randomUUID } from 'node:crypto';
import type { JudgeApplicationRepository } from '../application/ports.js';
import { AlreadyAppliedError } from '../domain/errors.js';
import type { JudgeApplication } from '../domain/judge-application.js';

export class InMemoryJudgeApplicationRepository implements JudgeApplicationRepository {
  private readonly items: JudgeApplication[] = [];

  async findByUserAndEdition(userId: string, editionId: string) {
    return this.items.find((a) => a.userId === userId && a.editionId === editionId) ?? null;
  }

  async create(data: Omit<JudgeApplication, 'id'>) {
    if (await this.findByUserAndEdition(data.userId, data.editionId)) {
      throw new AlreadyAppliedError();
    }
    const application = { id: randomUUID(), ...data };
    this.items.push(application);
    return application;
  }
}

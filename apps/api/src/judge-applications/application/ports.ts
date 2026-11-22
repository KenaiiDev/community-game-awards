import type { Edition } from '../domain/edition.js';
import type { JudgeApplication } from '../domain/judge-application.js';

export interface EditionRepository {
  /** The edition running at `now` (see PrismaEditionRepository), or null when none exists. */
  findActive(now: Date): Promise<Edition | null>;
}

export interface JudgeApplicationRepository {
  findByUserAndEdition(userId: string, editionId: string): Promise<JudgeApplication | null>;
  /** Persists a new application; rejects with AlreadyAppliedError on a duplicate. */
  create(application: Omit<JudgeApplication, 'id'>): Promise<JudgeApplication>;
}

export interface Clock {
  now(): Date;
}

export const EDITION_REPOSITORY = Symbol('EditionRepository');
export const JUDGE_APPLICATION_REPOSITORY = Symbol('JudgeApplicationRepository');
export const CLOCK = Symbol('Clock');

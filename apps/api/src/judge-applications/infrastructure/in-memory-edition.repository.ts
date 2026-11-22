import type { EditionRepository } from '../application/ports.js';
import type { Edition } from '../domain/edition.js';

export class InMemoryEditionRepository implements EditionRepository {
  constructor(private readonly editions: Edition[] = []) {}

  async findActive(): Promise<Edition | null> {
    return this.editions[0] ?? null;
  }
}

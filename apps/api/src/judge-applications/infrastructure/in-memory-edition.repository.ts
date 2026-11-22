import type { EditionRepository } from '../application/ports.js';
import type { Edition } from '../domain/edition.js';

/** Same selection rule as PrismaEditionRepository. */
export class InMemoryEditionRepository implements EditionRepository {
  constructor(private readonly editions: Edition[] = []) {}

  async findActive(now: Date): Promise<Edition | null> {
    const byOpening = [...this.editions].sort(
      (a, b) => a.signupOpensAt.getTime() - b.signupOpensAt.getTime(),
    );
    const opened = byOpening.filter((e) => e.signupOpensAt <= now);
    return opened.at(-1) ?? byOpening[0] ?? null;
  }
}

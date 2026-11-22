import type { PrismaService } from '../../prisma/prisma.service.js';
import type { Edition } from '../domain/edition.js';

export type EditionInput = Omit<Edition, 'id'>;

/** Creates the edition or updates it in place, keyed by slug. */
export async function upsertEdition(prisma: PrismaService, input: EditionInput): Promise<Edition> {
  if (input.signupClosesAt <= input.signupOpensAt) {
    throw new Error('signupClosesAt must be after signupOpensAt');
  }
  const { slug, ...rest } = input;
  return prisma.edition.upsert({
    where: { slug },
    create: input,
    update: rest,
    select: { id: true, slug: true, name: true, signupOpensAt: true, signupClosesAt: true },
  });
}

import 'dotenv/config';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service.js';
import { upsertEdition } from '../judge-applications/infrastructure/upsert-edition.js';

// Usage: EDITION_SLUG=express-2026 EDITION_NAME="..." SIGNUP_OPENS_AT=2026-11-22T00:00:00Z \
//        SIGNUP_CLOSES_AT=2026-12-15T00:00:00Z pnpm edition:upsert
const env = z
  .object({
    EDITION_SLUG: z.string().regex(/^[a-z0-9-]+$/),
    EDITION_NAME: z.string().min(1),
    SIGNUP_OPENS_AT: z.iso.datetime(),
    SIGNUP_CLOSES_AT: z.iso.datetime(),
  })
  .parse(process.env);

const prisma = new PrismaService();
try {
  const edition = await upsertEdition(prisma, {
    slug: env.EDITION_SLUG,
    name: env.EDITION_NAME,
    signupOpensAt: new Date(env.SIGNUP_OPENS_AT),
    signupClosesAt: new Date(env.SIGNUP_CLOSES_AT),
  });
  console.log(`Edition "${edition.slug}" saved: signup ${edition.signupOpensAt.toISOString()} -> ${edition.signupClosesAt.toISOString()}`);
} finally {
  await prisma.$disconnect();
}

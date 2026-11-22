import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // `prisma generate` (run on install) needs no database, so a missing URL must
  // not fail it; migrate commands still fail loudly against an empty URL.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});

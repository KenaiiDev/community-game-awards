import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Migrations run on a direct connection (Neon: the non-pooled URL); the app uses
  // the pooled DATABASE_URL. `prisma generate` (run on install) needs no database,
  // so a missing URL must not fail it; migrate commands still fail loudly.
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '' },
});

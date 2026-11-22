import { defineConfig } from 'vitest/config';

// Integration tests run against a real Postgres. Point DATABASE_URL at a
// disposable database (see README): every test truncates the tables.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.int-spec.ts'],
    fileParallelism: false,
  },
});

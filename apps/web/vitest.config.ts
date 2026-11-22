import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { '@': path.join(dirname, 'src') } },
  test: {
    projects: [
      {
        // Pure logic: API client, Zustand stores, translation files.
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] },
      },
      {
        // Every story is a test: it renders, runs its play function (interaction
        // test) and is compared against its reference screenshot (visual test).
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        test: {
          name: 'storybook',
          setupFiles: ['./.storybook/vitest.visual.ts'],
          browser: {
            enabled: true,
            headless: true,
            // A large browser window keeps the test frame at 1:1 scale, so screenshots
            // are taken at the real story size (see .storybook/vitest.visual.ts).
            provider: playwright({ contextOptions: { viewport: { width: 1600, height: 5000 } } }),
            instances: [{ browser: 'chromium' }],
            viewport: { width: 1280, height: 720 },
            expect: {
              toMatchScreenshot: {
                comparatorName: 'pixelmatch',
                comparatorOptions: { allowedMismatchedPixelRatio: 0.001 },
              },
            },
          },
        },
      },
    ],
  },
});

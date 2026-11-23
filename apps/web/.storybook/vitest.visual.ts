import { afterEach, expect } from 'vitest';
import { page } from 'vitest/browser';

const DESKTOP_WIDTH = 1280;
const MOBILE_WIDTH = 390;
const MIN_HEIGHT = 720;

// Visual TDD: after a story renders and its play function passes, the full story
// is compared against its committed reference screenshot. A new story fails until
// its reference is generated, reviewed and committed; any unintended visual change
// fails the suite.
//
// Convention: stories whose name ends with "Mobile" (story id "...-mobile") are
// captured at a phone width. Only the story id reaches the test metadata.
afterEach(async (context) => {
  if (context.task.result?.state === 'fail') return;
  const storyId = (context.task.meta as { storyId?: string }).storyId ?? '';
  const width = storyId.endsWith('-mobile') ? MOBILE_WIDTH : DESKTOP_WIDTH;
  // Web fonts load asynchronously; capture only once they are in use.
  await document.fonts.ready;
  try {
    // Set the width first, then grow the frame to the content height so the
    // whole story (not only the first screen) is part of the reference.
    await page.viewport(width, MIN_HEIGHT);
    const height = Math.max(MIN_HEIGHT, document.documentElement.scrollHeight);
    await page.viewport(width, height);
    await expect.element(page.elementLocator(document.body)).toMatchScreenshot();
  } finally {
    await page.viewport(DESKTOP_WIDTH, MIN_HEIGHT);
  }
});

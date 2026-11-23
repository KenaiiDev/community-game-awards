import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALE_CODES } from './locales';

export const routing = defineRouting({
  locales: LOCALE_CODES,
  defaultLocale: DEFAULT_LOCALE,
  // The default language lives at "/", every other one at "/<code>".
  localePrefix: 'as-needed',
  // On a first visit the browser's Accept-Language picks the language; unsupported
  // or missing preferences fall back to English. A language chosen in the menu is
  // remembered in a cookie and wins over the browser setting.
  localeDetection: true,
});

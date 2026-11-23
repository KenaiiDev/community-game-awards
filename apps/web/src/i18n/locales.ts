/**
 * The languages the site is available in. This is the only list to edit when
 * adding a translation (see README → "Translating"):
 *
 *   1. Copy src/messages/en.json to src/messages/<code>.json and translate it.
 *   2. Add `{ code: '<code>', name: '<native name>' }` below.
 *
 * `code` is a BCP 47 tag (e.g. "pt-BR"); `name` is shown in the language menu in
 * its own language; `dir: 'rtl'` marks right-to-left scripts such as Arabic.
 */
export const LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
] as const satisfies readonly { code: string; name: string; dir?: 'ltr' | 'rtl' }[];

export type Locale = (typeof LOCALES)[number]['code'];

/** Used when the visitor's browser language is unavailable or not translated. */
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_CODES = LOCALES.map((l) => l.code) as unknown as readonly [Locale, ...Locale[]];

export function localeDirection(code: string): 'ltr' | 'rtl' {
  const locale = LOCALES.find((l) => l.code === code) as { dir?: 'ltr' | 'rtl' } | undefined;
  return locale?.dir ?? 'ltr';
}

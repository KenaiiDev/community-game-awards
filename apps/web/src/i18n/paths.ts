import { DEFAULT_LOCALE } from './locales';

/** A site path in the given language: English lives at the root, others under /<code>. */
export function localePath(locale: string, path = '/'): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE } from './locales';
import { withFallback, type Messages } from './fallback';
import { routing } from './routing';

async function loadMessages(locale: string): Promise<Messages> {
  return (await import(`../messages/${locale}.json`)).default as Messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const english = await loadMessages(DEFAULT_LOCALE);
  return {
    locale,
    // All dates are shown in UTC because every edition deadline is defined in UTC.
    timeZone: 'UTC',
    messages: locale === DEFAULT_LOCALE ? english : withFallback(english, await loadMessages(locale)),
  };
});

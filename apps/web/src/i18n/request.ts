import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    // All dates are shown in UTC because every edition deadline is defined in UTC.
    timeZone: 'UTC',
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

import type { Preview } from '@storybook/nextjs-vite';
import { NextIntlClientProvider } from 'next-intl';
import { DEFAULT_LOCALE, LOCALES } from '../src/i18n/locales';
import { withFallback, type Messages } from '../src/i18n/fallback';
import '../src/ui/fonts';
import '../src/app/globals.css';

// Every translation file, with the same English fallback the app uses, so a new
// language shows up in the toolbar without touching this file.
const files = import.meta.glob<{ default: Messages }>('../src/messages/*.json', { eager: true });
const english = files[`../src/messages/${DEFAULT_LOCALE}.json`].default;
const messages = Object.fromEntries(
  LOCALES.map(({ code }) => [code, withFallback(english, files[`../src/messages/${code}.json`]?.default ?? {})]),
);

// A fixed "now" keeps relative dates and screenshots deterministic.
export const STORY_NOW = new Date('2026-11-25T12:00:00Z');

const preview: Preview = {
  globalTypes: {
    locale: {
      description: 'Interface language',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: LOCALES.map(({ code, name }) => ({ value: code, title: name })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: DEFAULT_LOCALE },
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
  },
  decorators: [
    (Story, context) => {
      const locale = (context.parameters.locale ?? context.globals.locale ?? DEFAULT_LOCALE) as string;
      return (
        <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC" now={STORY_NOW}>
          <div className="min-h-screen bg-ink-950 p-6 text-ink-50">
            <Story />
          </div>
        </NextIntlClientProvider>
      );
    },
  ],
};

export default preview;

import type { Preview } from '@storybook/nextjs-vite';
import { NextIntlClientProvider } from 'next-intl';
import en from '../src/messages/en.json';
import es from '../src/messages/es.json';
import '../src/app/globals.css';

const messages = { en, es } as const;

// A fixed "now" keeps relative dates and screenshots deterministic.
export const STORY_NOW = new Date('2026-11-25T12:00:00Z');

const preview: Preview = {
  globalTypes: {
    locale: {
      description: 'Interface language',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'es', title: 'Español' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: 'en' },
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
  },
  decorators: [
    (Story, context) => {
      const locale = (context.parameters.locale ?? context.globals.locale ?? 'en') as keyof typeof messages;
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

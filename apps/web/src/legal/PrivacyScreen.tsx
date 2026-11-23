'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { localePath } from '@/i18n/paths';
import { ButtonLink } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { PRIVACY_CONTACT, PRIVACY_UPDATED } from './contact';

const SECTIONS = ['who', 'collect', 'public', 'why', 'processors', 'retention', 'choices', 'changes'] as const;
const LISTS: Partial<Record<(typeof SECTIONS)[number], readonly string[]>> = {
  collect: ['discord', 'applications', 'cookies', 'ip', 'none'],
  choices: ['withdraw', 'delete', 'update', 'contact'],
};

function Email() {
  return (
    <a href={`mailto:${PRIVACY_CONTACT}`} className="text-lime-300 underline underline-offset-4">
      {PRIVACY_CONTACT}
    </a>
  );
}

/** The privacy policy: what is stored, what becomes public, and how to stay in control. */
export function PrivacyScreen({ locale }: { locale: string }) {
  const t = useTranslations('privacy');
  const format = useFormatter();
  const rich = (key: string): ReactNode => t.rich(key, { email: () => <Email /> });

  return (
    <main className="relative min-h-dvh bg-ink-950 px-4 py-10 text-ink-50 sm:py-16">
      <Panel cut={20} className="relative mx-auto max-w-2xl animate-rise" innerClassName="space-y-8 p-6 sm:p-10">
        <header>
          <h1 className="font-display text-3xl font-bold tracking-wide uppercase sm:text-4xl">{t('title')}</h1>
          <p className="mt-2 font-pixel text-[0.65rem] tracking-wider text-ink-400 uppercase">
            {t('updated', { date: format.dateTime(new Date(PRIVACY_UPDATED), { dateStyle: 'long', timeZone: 'UTC' }) })}
          </p>
          <p className="mt-4 leading-7 text-ink-200">{t('intro')}</p>
        </header>
        {SECTIONS.map((section) => (
          <section key={section}>
            <h2 className="mb-2 font-display text-xl font-semibold">{t(`${section}.title`)}</h2>
            {LISTS[section] ? (
              <ul className="space-y-2">
                {LISTS[section].map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-ink-200">
                    <span aria-hidden="true" className="text-lime-400">
                      ◆
                    </span>
                    <span>{rich(`${section}.${item}`)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-ink-200">{rich(`${section}.body`)}</p>
            )}
          </section>
        ))}
        <ButtonLink href={localePath(locale)}>{t('back')}</ButtonLink>
      </Panel>
    </main>
  );
}

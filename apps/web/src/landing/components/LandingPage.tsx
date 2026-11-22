'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { ButtonLink } from '@/ui/Button';
import type { Edition } from '@/judge-signup/api/types';

export interface LandingPageProps {
  locale: string;
  edition: Edition | null;
  /** The judge signup card (container in the app, presentational in stories). */
  signup: ReactNode;
}

// Explicit prefixes on purpose: the middleware remembers the chosen locale in a
// cookie, and only a prefixed URL updates it ("/en" redirects to "/" afterwards).
const LOCALES = [
  { code: 'en', label: 'English', href: '/en' },
  { code: 'es', label: 'Español', href: '/es' },
];

const STEPS = ['signup', 'draw', 'play', 'nominate', 'vote', 'reveal'] as const;
const PRINCIPLES = ['transparent', 'verifiable', 'fair'] as const;

function Trophy() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-gold-400">
      <path d="M18 3V2H6v1H2v3a5 5 0 0 0 4.6 5A6 6 0 0 0 11 14.9V18H8v3h8v-3h-3v-3.1A6 6 0 0 0 17.4 11 5 5 0 0 0 22 6V3h-4ZM4 6V5h2v3.8A3 3 0 0 1 4 6Zm16 0a3 3 0 0 1-2 2.8V5h2v1Z" />
    </svg>
  );
}

export function LandingPage({ locale, edition, signup }: LandingPageProps) {
  const t = useTranslations();
  const format = useFormatter();
  const signupOpen = edition?.signupStatus === 'open';
  const deadline =
    edition &&
    format.dateTime(new Date(edition.signupClosesAt), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    });

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 font-bold tracking-tight">
          <Trophy />
          {t('brand.name')}
        </span>
        <nav aria-label={t('nav.language')} className="flex gap-1 text-sm">
          {LOCALES.map(({ code, label, href }) => (
            <a
              key={code}
              href={href}
              hrefLang={code}
              aria-current={code === locale ? 'true' : undefined}
              className={`rounded-md px-3 py-1.5 ${
                code === locale ? 'bg-ink-800 text-ink-50' : 'text-ink-400 hover:text-ink-50'
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-start gap-12 px-6 pt-10 pb-20 lg:grid-cols-[1.2fr_1fr] lg:pt-20">
          <div className="space-y-6">
            {edition && (
              <p className="text-sm font-semibold tracking-wide text-gold-400 uppercase">
                {signupOpen
                  ? t('hero.eyebrow', { edition: edition.name })
                  : t('hero.eyebrowClosed', { edition: edition.name })}
              </p>
            )}
            <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl">
              {t('hero.title')}
            </h1>
            <p className="max-w-xl text-lg leading-8 text-ink-200">{t('hero.subtitle')}</p>
            {signupOpen && (
              <div className="flex flex-wrap items-center gap-4">
                <ButtonLink href="#judge-signup">{t('hero.cta')}</ButtonLink>
                <span className="text-sm text-ink-400">{t('hero.deadline', { date: deadline ?? '' })}</span>
              </div>
            )}
          </div>
          <div id="judge-signup" className="scroll-mt-8">
            {signup}
          </div>
        </section>

        <section className="border-t border-ink-800 bg-ink-900/50">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="mb-10 text-2xl font-bold tracking-tight">{t('steps.title')}</h2>
            <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step} className="rounded-xl border border-ink-800 bg-ink-900 p-5">
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold-400/15 text-sm font-bold text-gold-400">
                    {index + 1}
                  </span>
                  <h3 className="mb-1 font-semibold">{t(`steps.${step}.title`)}</h3>
                  <p className="text-sm leading-6 text-ink-400">{t(`steps.${step}.body`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-10 text-2xl font-bold tracking-tight">{t('principles.title')}</h2>
          <ul className="grid gap-6 md:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <li key={principle} className="border-l-2 border-gold-400 pl-4">
                <h3 className="mb-1 font-semibold">{t(`principles.${principle}.title`)}</h3>
                <p className="text-sm leading-6 text-ink-400">{t(`principles.${principle}.body`)}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-ink-800 px-6 py-8 text-center text-sm text-ink-400">
        {t('footer.openSource')}
      </footer>
    </div>
  );
}

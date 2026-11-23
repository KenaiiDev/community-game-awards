'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { Button, ButtonLink } from '@/ui/Button';
import { Avatar } from '@/ui/Avatar';
import { Panel } from '@/ui/Panel';
import type { Edition } from '@/judge-signup/api/types';
import { LOCALES } from '@/i18n/locales';

export interface LandingPageProps {
  locale: string;
  edition: Edition | null;
  /** The judge signup card (container in the app, presentational in stories). */
  signup: ReactNode;
  /** The signed-in visitor, shown in the header with a way to sign out. */
  account?: { user: { displayName: string; avatarUrl: string | null }; onSignOut(): void } | null;
}


/** Staggered entrance order: style={stagger(n)} with the animate-rise/pop classes. */
const stagger = (i: number) => ({ '--i': i }) as CSSProperties;

const STEPS = ['signup', 'draw', 'play', 'nominate', 'vote', 'reveal'] as const;
const PRINCIPLES = ['transparent', 'verifiable', 'fair'] as const;

function Trophy() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-gold-400">
      <path d="M18 3V2H6v1H2v3a5 5 0 0 0 4.6 5A6 6 0 0 0 11 14.9V18H8v3h8v-3h-3v-3.1A6 6 0 0 0 17.4 11 5 5 0 0 0 22 6V3h-4ZM4 6V5h2v3.8A3 3 0 0 1 4 6Zm16 0a3 3 0 0 1-2 2.8V5h2v1Z" />
    </svg>
  );
}

function Lock() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3 fill-current">
      <path d="M4 7V5a4 4 0 1 1 8 0v2h1v8H3V7h1Zm2 0h4V5a2 2 0 1 0-4 0v2Z" />
    </svg>
  );
}

function Globe() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
    </svg>
  );
}

export function LandingPage({ locale, edition, signup, account }: LandingPageProps) {
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
    <div className="relative min-h-screen overflow-hidden bg-ink-950 text-ink-50">
      {/* Stage lighting that drifts slowly behind the whole page: two warm glows,
          a cool one and a faint dot grid. Fixed, so it keeps moving while scrolling. */}
      <div data-testid="ambient" aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute -top-48 left-1/2 -ml-[30rem] h-[36rem] w-[60rem] animate-drift-a rounded-full bg-[radial-gradient(closest-side,rgb(240_193_75/0.16),transparent)]" />
        <div className="absolute -top-24 -right-40 h-[30rem] w-[30rem] animate-drift-b rounded-full bg-[radial-gradient(closest-side,rgb(88_101_242/0.16),transparent)]" />
        <div className="absolute top-1/2 -left-48 h-[32rem] w-[32rem] animate-drift-c rounded-full bg-[radial-gradient(closest-side,rgb(240_193_75/0.08),transparent)]" />
        <div className="absolute inset-0 animate-pan bg-[radial-gradient(rgb(255_255_255/0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)] bg-[size:24px_24px]" />
      </div>

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="group flex items-center gap-2 font-display font-bold tracking-wider uppercase">
          <span className="inline-flex group-hover:animate-wiggle">
            <Trophy />
          </span>
          {t('brand.name')}
        </span>
        <div className="flex items-center gap-2">
          {account && (
            <div className="chamfer flex animate-swap items-center gap-2 bg-ink-800/80 p-1 pl-1.5 [--cut:8px]">
              <Avatar name={account.user.displayName} src={account.user.avatarUrl} size={28} />
              <span className="hidden max-w-32 truncate font-display text-sm text-ink-200 sm:inline">{account.user.displayName}</span>
              <Button variant="ghost" onClick={account.onSignOut}>
                {t('signup.signOut')}
              </Button>
            </div>
          )}
          <nav aria-label={t('nav.language')} className="relative font-display text-sm">
            {/* <details> keeps the menu usable without JavaScript and scales to any
                number of community translations. */}
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-1.5 text-ink-200 hover:bg-ink-800 hover:text-ink-50 [&::-webkit-details-marker]:hidden">
                <Globe />
                <span>{LOCALES.find((l) => l.code === locale)?.name ?? locale}</span>
                <span aria-hidden="true" className="text-xs transition-transform group-open:rotate-180">▾</span>
              </summary>
              <ul className="chamfer absolute right-0 z-10 mt-2 min-w-40 origin-top-right animate-swap border border-ink-700 bg-ink-900 p-1 [--cut:8px]">
                {LOCALES.map(({ code, name }) => (
                  <li key={code}>
                    <a
                      // Always prefixed: the middleware remembers the chosen language in a
                      // cookie, and only a prefixed URL updates it ("/en" then redirects to "/").
                      href={`/${code}`}
                      hrefLang={code}
                      lang={code}
                      aria-current={code === locale ? 'true' : undefined}
                      className={`block px-3 py-2 ${
                        code === locale ? 'bg-ink-800 text-ink-50' : 'text-ink-200 hover:bg-ink-800 hover:text-ink-50'
                      }`}
                    >
                      {name}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </nav>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-6xl items-start gap-12 px-6 pt-10 pb-20 lg:grid-cols-[1.2fr_1fr] lg:pt-20">
          <div className="space-y-6">
            {edition && (
              <p
                className="chamfer inline-flex animate-rise items-center gap-2 bg-gold-400/12 px-3 py-1.5 font-pixel text-[0.65rem] tracking-wider text-gold-300 uppercase [--cut:6px]"
                style={stagger(0)}
              >
                {signupOpen && (
                  <span aria-hidden="true" className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping bg-gold-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 bg-gold-400" />
                  </span>
                )}
                {signupOpen
                  ? t('hero.eyebrow', { edition: edition.name })
                  : t('hero.eyebrowClosed', { edition: edition.name })}
              </p>
            )}
            <h1
              className="animate-rise bg-gradient-to-br from-ink-50 from-40% to-gold-300 bg-clip-text font-display text-5xl leading-[1.02] font-bold tracking-tight text-balance text-transparent sm:text-7xl"
              style={stagger(1)}
            >
              {t('hero.title')}
            </h1>
            {/* The pitch reads like a game's dialog box, with its "next" indicator. */}
            <Panel
              tone="muted"
              cut={12}
              className="max-w-xl animate-rise"
              innerClassName="relative bg-ink-900/90 px-5 py-4 pr-10"
              style={stagger(2)}
            >
              <p className="text-base leading-7 text-ink-200 sm:text-lg sm:leading-8">{t('hero.subtitle')}</p>
              <span aria-hidden="true" className="absolute right-4 bottom-3 animate-blink text-xs text-gold-400">
                ▼
              </span>
            </Panel>
            {signupOpen && (
              <div className="flex animate-rise flex-wrap items-center gap-4" style={stagger(3)}>
                <ButtonLink href="#judge-signup">{t('hero.cta')}</ButtonLink>
                <span className="font-display text-sm text-ink-400">{t('hero.deadline', { date: deadline ?? '' })}</span>
              </div>
            )}
          </div>
          <div id="judge-signup" className="animate-rise scroll-mt-8" style={stagger(3)}>
            {signup}
          </div>
        </section>

        <section className="relative border-t border-ink-800 bg-ink-900/50">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 id="quest-log" className="mb-10 font-display text-3xl font-bold tracking-wide uppercase">
              {t('steps.title')}
            </h2>
            <ol aria-labelledby="quest-log" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((step, index) => {
                // While signup is open the edition sits on stage 1; later stages are locked.
                const current = signupOpen && index === 0;
                const locked = signupOpen && index > 0;
                return (
                  <Panel
                    as="li"
                    key={step}
                    tone={current ? 'active' : 'default'}
                    aria-current={current ? 'step' : undefined}
                    className={`group reveal-on-scroll transition-[transform,opacity] duration-200 hover:-translate-y-1 ${
                      locked ? 'opacity-60 hover:opacity-100' : ''
                    }`}
                    innerClassName={`p-5 ${current ? 'bg-[linear-gradient(160deg,rgb(240_193_75/0.12),transparent_60%)] bg-ink-900' : ''}`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3 font-pixel text-[0.6rem] tracking-wider uppercase">
                      <span className="text-ink-400">{t('steps.stage', { number: String(index + 1).padStart(2, '0') })}</span>
                      {current && (
                        <span className="chamfer flex items-center gap-1.5 bg-gold-400 px-2 py-1 text-ink-950 [--cut:4px]">
                          <span aria-hidden="true" className="animate-blink">
                            ▶
                          </span>
                          {t('steps.current')}
                        </span>
                      )}
                      {locked && (
                        <span className="flex items-center gap-1.5 text-ink-400">
                          <Lock />
                          {t('steps.locked')}
                        </span>
                      )}
                    </div>
                    <h3 className="mb-1 font-display text-lg font-semibold">{t(`steps.${step}.title`)}</h3>
                    <p className="text-sm leading-6 text-ink-400">{t(`steps.${step}.body`)}</p>
                  </Panel>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-10 font-display text-3xl font-bold tracking-wide uppercase">{t('principles.title')}</h2>
          <ul className="grid gap-6 md:grid-cols-3">
            {PRINCIPLES.map((principle, index) => (
              <li
                key={principle}
                className="reveal-on-scroll border-l-2 border-gold-400/50 pl-4 transition-colors duration-200 hover:border-gold-300"
              >
                <span className="mb-2 block font-pixel text-[0.6rem] text-gold-400">#{index + 1}</span>
                <h3 className="mb-1 font-display text-lg font-semibold">{t(`principles.${principle}.title`)}</h3>
                <p className="text-sm leading-6 text-ink-400">{t(`principles.${principle}.body`)}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="relative border-t border-ink-800 px-6 py-8 text-center font-pixel text-[0.65rem] tracking-wider text-ink-400 uppercase">
        {t('footer.openSource')}
      </footer>
    </div>
  );
}

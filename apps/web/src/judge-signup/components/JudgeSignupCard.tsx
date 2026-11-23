'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { Avatar } from '@/ui/Avatar';
import { Button, ButtonLink } from '@/ui/Button';
import type { SignupView } from '../state/judge-signup.store';

const KNOWN_ERRORS = [
  'already_applied',
  'signup_closed',
  'signup_not_open',
  'consent_required',
  'unauthenticated',
] as const;

export interface JudgeSignupCardProps {
  view: SignupView;
  signInUrl: string;
  onConsentChange(consent: boolean): void;
  onSubmit(): void;
  onSignOut(): void;
  onRetry(): void;
}

function DiscordMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18.2 18.2 0 0 0-5.6 0L8.6 3a19.5 19.5 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18a19.8 19.8 0 0 0 6 3l1.3-2a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.7 19.7 0 0 0 6-3c.5-5.1-.8-9.5-3.6-13.6ZM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.4 8 10.4s2.2 1.1 2.2 2.5-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.5 2.2-2.5 2.2 1.1 2.2 2.5-1 2.4-2.2 2.4Z" />
    </svg>
  );
}

const CONFETTI_COLORS = ['bg-gold-300', 'bg-gold-500', 'bg-discord', 'bg-success', 'bg-ink-50'];

// A deterministic burst: pieces fan out evenly around the avatar, so every render
// (and every screenshot) is identical.
const CONFETTI = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  const distance = 110 + (i % 3) * 40;
  return {
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    style: {
      '--x': `${Math.round(Math.cos(angle) * distance)}px`,
      '--y': `${Math.round(Math.sin(angle) * distance - 40)}px`,
      '--r': `${(i % 2 ? 1 : -1) * (180 + i * 25)}deg`,
      '--d': `${(i % 4) * 40}ms`,
    } as CSSProperties,
  };
});

/** Decorative only; hidden entirely for visitors who prefer reduced motion. */
function Celebration() {
  return (
    <div
      data-testid="celebration"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[84px] motion-reduce:hidden"
    >
      {CONFETTI.map((piece, i) => (
        <span key={i} className={`confetti-piece ${piece.color}`} style={piece.style} />
      ))}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 fill-none stroke-ink-950 opacity-0 peer-checked:animate-pop peer-checked:opacity-100"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

function AccountRow({ user, onSignOut }: { user: { displayName: string; avatarUrl: string | null }; onSignOut(): void }) {
  const t = useTranslations('signup');
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-ink-800 px-4 py-3 text-left">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={user.displayName} src={user.avatarUrl} />
        <span className="truncate text-sm text-ink-200">{t('signedInAs', { name: user.displayName })}</span>
      </div>
      <Button variant="ghost" onClick={onSignOut}>
        {t('signOut')}
      </Button>
    </div>
  );
}

function Notice({ tone, children }: { tone: 'info' | 'danger' | 'success'; children: ReactNode }) {
  const tones = {
    info: 'border-ink-700 bg-ink-800 text-ink-200',
    danger: 'border-danger/40 bg-danger/10 text-danger',
    success: 'border-success/40 bg-success/10 text-success',
  };
  return (
    <p role={tone === 'danger' ? 'alert' : undefined} className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}

export function JudgeSignupCard({
  view,
  signInUrl,
  onConsentChange,
  onSubmit,
  onSignOut,
  onRetry,
}: JudgeSignupCardProps) {
  const t = useTranslations('signup');
  const format = useFormatter();
  // Deadlines are defined in UTC, so the zone is always printed next to the time.
  const date = (iso: string) =>
    format.dateTime(new Date(iso), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    });

  let body: ReactNode;
  switch (view.kind) {
    case 'loading':
      body = (
        <p aria-busy="true" className="flex items-center gap-3 text-sm text-ink-400">
          <span aria-hidden="true" className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-bounce rounded-full bg-gold-400"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
          {t('loading')}
        </p>
      );
      break;
    case 'load_error':
      body = (
        <div className="space-y-4">
          <Notice tone="danger">{t('loadError')}</Notice>
          <Button variant="ghost" onClick={onRetry}>
            {t('retry')}
          </Button>
        </div>
      );
      break;
    case 'no_edition':
      body = <Notice tone="info">{t('noEdition')}</Notice>;
      break;
    case 'not_open':
      body = (
        <Notice tone="info">
          {t('notOpen', { edition: view.edition.name, date: date(view.edition.signupOpensAt) })}
        </Notice>
      );
      break;
    case 'closed':
      body = (
        <Notice tone="info">
          {t('closed', { edition: view.edition.name, date: date(view.edition.signupClosesAt) })}
        </Notice>
      );
      break;
    case 'signed_out':
      body = (
        <div className="space-y-5">
          {view.authError && <Notice tone="danger">{t(`authError.${view.authError}`)}</Notice>}
          <p className="text-sm leading-6 text-ink-200">{t('signedOutBody')}</p>
          <ButtonLink variant="discord" href={signInUrl} className="w-full">
            <DiscordMark />
            {t('signIn')}
          </ButtonLink>
          <p className="text-xs text-ink-400">{t('deadline', { date: date(view.edition.signupClosesAt) })}</p>
        </div>
      );
      break;
    case 'ready': {
      const errorKey = view.error && (KNOWN_ERRORS as readonly string[]).includes(view.error) ? view.error : 'unknown';
      body = (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <AccountRow user={view.user} onSignOut={onSignOut} />
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm leading-6 transition-colors duration-200 ${
              view.consent ? 'border-gold-400/60 bg-gold-400/10 text-ink-50' : 'border-ink-700 text-ink-200 hover:border-ink-400'
            }`}
          >
            <span className="relative mt-0.5 flex shrink-0">
              <input
                type="checkbox"
                checked={view.consent}
                disabled={view.submitting}
                onChange={(event) => onConsentChange(event.target.checked)}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-ink-400 transition-[background-color,border-color,transform] duration-150 checked:border-gold-400 checked:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 active:scale-90 disabled:cursor-not-allowed"
              />
              <CheckIcon />
            </span>
            <span>{t('consent')}</span>
          </label>
          {view.error && <Notice tone="danger">{t(`error.${errorKey}`)}</Notice>}
          <Button type="submit" className="w-full" disabled={!view.consent || view.submitting}>
            {view.submitting ? t('submitting') : t('submit')}
          </Button>
          <p className="text-xs text-ink-400">{t('deadline', { date: date(view.edition.signupClosesAt) })}</p>
        </form>
      );
      break;
    }
    case 'applied':
      body = (
        <div className="relative space-y-4 text-center">
          <Celebration />
          <div className="flex flex-col items-center gap-3">
            <span className="animate-pop rounded-full p-1 ring-2 ring-gold-400 ring-offset-4 ring-offset-ink-900">
              <Avatar name={view.user.displayName} src={view.user.avatarUrl} size={64} />
            </span>
            <h3 className="animate-rise text-xl font-bold text-gold-300" style={{ '--i': 2 } as CSSProperties}>
              {t('appliedTitle')}
            </h3>
          </div>
          <p className="animate-rise text-sm leading-6 text-ink-200" style={{ '--i': 3 } as CSSProperties}>
            {t('appliedBody', { edition: view.edition.name, date: date(view.application.consentedAt) })}
          </p>
          <div className="pt-2">
            <AccountRow user={view.user} onSignOut={onSignOut} />
          </div>
        </div>
      );
      break;
  }

  return (
    <section
      data-testid="judge-signup-card"
      aria-labelledby="judge-signup-title"
      className="relative rounded-2xl border border-ink-700 bg-ink-900 p-6 shadow-2xl shadow-black/40 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent"
      />
      <h2 id="judge-signup-title" className="mb-5 text-xl font-bold tracking-tight">
        {t('title')}
      </h2>
      {/* Keyed by state, so every step of the flow transitions in instead of jumping. */}
      <div key={view.kind} className="animate-swap">
        {body}
      </div>
    </section>
  );
}

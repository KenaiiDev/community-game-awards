'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { Avatar } from '@/ui/Avatar';
import { Button, ButtonLink } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
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

/** Who is applying. Signing out lives in the page header. */
function Identity({ user }: { user: { displayName: string; avatarUrl: string | null } }) {
  const t = useTranslations('signup');
  return (
    <div className="flex items-center gap-3 bg-ink-800/70 px-4 py-3 text-left">
      <Avatar name={user.displayName} src={user.avatarUrl} />
      <span className="truncate text-sm text-ink-200">{t('signedInAs', { name: user.displayName })}</span>
    </div>
  );
}

const OBJECTIVES = ['signIn', 'consent', 'submit'] as const;

/** Which quest objective is next, or null when the view is not part of the quest. */
function questProgress(view: SignupView): number | null {
  if (view.kind === 'signed_out') return 0;
  if (view.kind === 'ready') return view.consent ? 2 : 1;
  return null;
}

function Objectives({ next }: { next: number }) {
  const t = useTranslations('signup.objectives');
  return (
    <ol aria-label={t('title')} className="space-y-2.5 border-y border-dashed border-ink-700 py-4">
      {OBJECTIVES.map((objective, index) => {
        const done = index < next;
        const current = index === next;
        return (
          <li
            key={objective}
            aria-current={current ? 'step' : undefined}
            className={`flex items-center gap-3 font-display text-sm font-medium transition-colors duration-200 ${
              current ? 'text-ink-50' : 'text-ink-400'
            }`}
          >
            <span
              aria-hidden="true"
              className={`chamfer flex h-5 w-5 shrink-0 items-center justify-center text-[0.55rem] [--cut:4px] ${
                done ? 'animate-pop bg-gold-400 text-ink-950' : current ? 'bg-gold-400/20 text-gold-300' : 'bg-ink-800'
              }`}
            >
              {done ? '✓' : current ? <span className="animate-blink">▶</span> : null}
            </span>
            <span className={done ? 'line-through decoration-ink-700' : undefined}>{t(objective)}</span>
            {done && <span className="ml-auto font-pixel text-[0.6rem] text-gold-400 uppercase">{t('done')}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Trophy({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`fill-current ${className}`}>
      <path d="M18 3V2H6v1H2v3a5 5 0 0 0 4.6 5A6 6 0 0 0 11 14.9V18H8v3h8v-3h-3v-3.1A6 6 0 0 0 17.4 11 5 5 0 0 0 22 6V3h-4ZM4 6V5h2v3.8A3 3 0 0 1 4 6Zm16 0a3 3 0 0 1-2 2.8V5h2v1Z" />
    </svg>
  );
}

function Notice({ tone, children }: { tone: 'info' | 'danger' | 'success'; children: ReactNode }) {
  const tones = {
    info: 'border-ink-700 bg-ink-800 text-ink-200',
    danger: 'border-danger/40 bg-danger/10 text-danger',
    success: 'border-success/40 bg-success/10 text-success',
  };
  return (
    <p role={tone === 'danger' ? 'alert' : undefined} className={`border-l-2 px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}

export function JudgeSignupCard({
  view,
  signInUrl,
  onConsentChange,
  onSubmit,
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
                className="h-2 w-2 animate-bounce bg-gold-400"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
          <span className="font-pixel text-xs uppercase">{t('loading')}</span>
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
          <Identity user={view.user} />
          <label
            className={`flex cursor-pointer items-start gap-3 border p-4 text-sm leading-6 transition-colors duration-200 ${
              view.consent ? 'border-gold-400/60 bg-gold-400/10 text-ink-50' : 'border-ink-700 text-ink-200 hover:border-ink-400'
            }`}
          >
            <span className="relative mt-0.5 flex shrink-0">
              <input
                type="checkbox"
                checked={view.consent}
                disabled={view.submitting}
                onChange={(event) => onConsentChange(event.target.checked)}
                className="peer h-5 w-5 cursor-pointer appearance-none border-2 border-ink-400 transition-[background-color,border-color,transform] duration-150 checked:border-gold-400 checked:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 active:scale-90 disabled:cursor-not-allowed"
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
          <p className="chamfer mx-auto inline-flex animate-pop items-center gap-2 bg-[linear-gradient(110deg,var(--color-gold-400)_40%,var(--color-gold-300)_50%,var(--color-gold-400)_60%)] bg-[length:250%_100%] px-4 py-2 font-pixel text-[0.7rem] text-ink-950 uppercase [--cut:8px] motion-safe:animate-shine">
            <Trophy className="h-4 w-4" />
            {t('achievement')}
          </p>
          <div className="flex flex-col items-center gap-3">
            <span className="animate-pop rounded-full p-1 ring-2 ring-gold-400 ring-offset-4 ring-offset-ink-900">
              <Avatar name={view.user.displayName} src={view.user.avatarUrl} size={64} />
            </span>
            <h3 className="animate-rise font-display text-2xl font-bold text-gold-300" style={{ '--i': 2 } as CSSProperties}>
              {t('appliedTitle')}
            </h3>
          </div>
          <p className="animate-rise text-sm leading-6 text-ink-200" style={{ '--i': 3 } as CSSProperties}>
            {t('appliedBody', { edition: view.edition.name, date: date(view.application.consentedAt) })}
          </p>
        </div>
      );
      break;
  }

  const progress = questProgress(view);

  return (
    <Panel
      as="section"
      data-testid="judge-signup-card"
      aria-labelledby="judge-signup-title"
      cut={20}
      className="drop-shadow-[0_24px_48px_rgb(0_0_0/0.5)]"
      innerClassName="p-6 sm:p-8"
    >
      {progress !== null && (
        <p className="mb-2 flex items-center gap-2 font-pixel text-[0.65rem] tracking-widest text-gold-400 uppercase">
          <span aria-hidden="true" className="animate-blink">
            ◆
          </span>
          {t('questLabel')}
        </p>
      )}
      <h2 id="judge-signup-title" className="font-display text-2xl font-bold tracking-wide uppercase">
        {t('title')}
      </h2>
      {progress !== null && (
        <>
          <p className="mt-1 mb-5 text-sm text-gold-300/80">{t('reward')}</p>
          <Objectives next={progress} />
        </>
      )}
      {/* Keyed by state, so every step of the flow transitions in instead of jumping. */}
      <div key={view.kind} className="mt-5 animate-swap">
        {body}
      </div>
    </Panel>
  );
}

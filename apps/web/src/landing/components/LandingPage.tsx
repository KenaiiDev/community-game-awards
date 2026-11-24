'use client';

import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import type { Edition } from '@/judge-signup/api/types';
import { LOCALES } from '@/i18n/locales';
import { localePath } from '@/i18n/paths';
import { PrivacyLink } from '@/legal/PrivacyLink';
import { roadmap, type RoadmapStage } from '../roadmap';

export interface LandingPageProps {
  locale: string;
  edition: Edition | null;
  /** The judge signup card (container in the app, presentational in stories). */
  signup: ReactNode;
  /** The signed-in visitor: shown in the HUD, with an Account screen in the menu. */
  account?: Account | null;
}

export interface Account {
  user: { displayName: string; avatarUrl: string | null };
  /** Set while a requested deletion is in its one-week grace period. */
  deletion: { scheduledFor: string } | null;
  busy?: boolean;
  error?: string;
  onSignOut(): void;
  onRequestDeletion(): void;
  onCancelDeletion(): void;
}

/** The main menu, in order. The first entry is the screen shown on arrival. */
const SCREENS = ['quest', 'log', 'rules', 'account', 'language'] as const;
type Screen = (typeof SCREENS)[number];

const DELETION_GRACE_MS = 7 * 86_400_000;
const DATE_TIME = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
} as const;

const STAGE_DATE = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' } as const;
const PRINCIPLES = ['transparent', 'verifiable', 'fair'] as const;

/** Staggered entrance order: style={stagger(n)} with the animate-rise/pop classes. */
const stagger = (i: number) => ({ '--i': i }) as CSSProperties;

const DAY = 86_400_000;
const HOUR = 3_600_000;

function Trophy() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-gold-400">
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

/** Days and hours until signup closes, refreshed every minute. */
function Countdown({ closesAt }: { closesAt: string }) {
  const t = useTranslations('hud');
  const now = useNow({ updateInterval: 60_000 });
  const left = new Date(closesAt).getTime() - now.getTime();
  if (left <= 0) return null;
  return (
    <span
      title={t('countdownLabel')}
      className="chamfer flex items-center gap-2 bg-ink-800/80 px-3 py-1.5 font-pixel text-[0.65rem] tracking-wider text-ink-200 uppercase [--cut:6px]"
    >
      <span aria-hidden="true" className="animate-blink text-lime-400">
        ⏱
      </span>
      {/* Server and browser clocks differ by the render time. */}
      <span suppressHydrationWarning>
        {t('countdown', { days: Math.floor(left / DAY), hours: Math.floor((left % DAY) / HOUR) })}
      </span>
    </span>
  );
}

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3 fill-current">
      <path d="m6 13.4-5-5L3.4 6 6 8.6 12.6 2 15 4.4l-9 9Z" />
    </svg>
  );
}

/** A stage's days: one date, or a range collapsed by the locale ("Jan 11 – 17, 2027"). */
function StageDates({ from, to }: Pick<RoadmapStage, 'from' | 'to'>) {
  const format = useFormatter();
  if (!from || !to) return null;
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  return (
    <p className="mt-0.5 font-pixel text-[0.6rem] tracking-wider text-lime-400 uppercase">
      {from === to ? (
        <time dateTime={from}>{format.dateTime(start, STAGE_DATE)}</time>
      ) : (
        format.dateTimeRange(start, end, STAGE_DATE)
      )}
    </p>
  );
}

/** The edition's roadmap: every phase with its dates, and where the edition is now. */
function QuestLog({ edition }: { edition: Edition | null }) {
  const t = useTranslations('steps');
  const now = useNow({ updateInterval: 60_000 });
  const stages = roadmap(edition, now);
  return (
    <Panel cut={20} innerClassName="p-6 sm:p-8">
      <h2 id="quest-log" className="mb-1 font-display text-2xl font-bold tracking-wide uppercase">
        {t('title')}
      </h2>
      <p className="mb-5 text-sm text-ink-400">{t('utc')}</p>
      <ol aria-labelledby="quest-log" className="space-y-2">
        {stages.map(({ stage, from, to, status }, index) => {
          const current = status === 'current';
          return (
            <li
              key={stage}
              aria-current={current ? 'step' : undefined}
              style={stagger(index)}
              className={`chamfer animate-rise px-4 py-3 [--cut:8px] ${
                current ? 'bg-gold-400/12' : status === 'done' ? 'bg-ink-800/25' : 'bg-ink-800/40'
              }`}
            >
              <div className="flex items-center justify-between gap-3 font-pixel text-[0.6rem] tracking-wider uppercase">
                <span className="text-ink-400">{t('stage', { number: String(index + 1).padStart(2, '0') })}</span>
                {current && (
                  <span className="chamfer flex items-center gap-1.5 bg-gold-400 px-2 py-1 text-ink-950 [--cut:4px]">
                    <span aria-hidden="true" className="animate-blink">
                      ▶
                    </span>
                    {t('current')}
                  </span>
                )}
                {status === 'upcoming' && (
                  <span className="flex items-center gap-1.5 text-ink-400">
                    <Lock />
                    {t('locked')}
                  </span>
                )}
                {status === 'done' && (
                  <span className="flex items-center gap-1.5 text-lime-400">
                    <Check />
                    {t('done')}
                  </span>
                )}
              </div>
              <h3 className="mt-1 font-display text-base font-semibold">{t(`${stage}.title`)}</h3>
              <StageDates from={from} to={to} />
              <p className="mt-1 text-sm leading-6 text-ink-400">{t(`${stage}.body`)}</p>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

/** Who is signed in, what we keep, and the self-service deletion with its grace week. */
function AccountScreen({ account }: { account: Account }) {
  const t = useTranslations('account');
  const format = useFormatter();
  const now = useNow();
  const [confirming, setConfirming] = useState(false);
  const errorKey = account.error === 'rate_limited' ? 'rate_limited' : 'unknown';

  return (
    <Panel cut={20} innerClassName="space-y-6 p-6 sm:p-8">
      <div>
        <h2 className="mb-4 font-display text-2xl font-bold tracking-wide uppercase">{t('title')}</h2>
        <div className="flex items-center gap-3">
          <Avatar name={account.user.displayName} src={account.user.avatarUrl} />
          <span className="text-sm text-ink-200">{t('signedInAs', { name: account.user.displayName })}</span>
        </div>
      </div>
      <div>
        <h3 className="mb-1 font-display text-lg font-semibold">{t('dataTitle')}</h3>
        <p className="text-sm leading-6 text-ink-400">
          {t('dataBody')} <PrivacyLink>{t('privacyLink')}</PrivacyLink>
        </p>
      </div>
      {account.error && (
        <p role="alert" className="border-l-2 border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {t(`error.${errorKey}`)}
        </p>
      )}
      {account.deletion ? (
        <div className="space-y-3 border border-danger/40 bg-danger/10 p-4">
          <p className="text-sm font-semibold text-ink-50">
            {t('pending', { date: format.dateTime(new Date(account.deletion.scheduledFor), DATE_TIME) })}
          </p>
          <p className="text-sm text-ink-200">{t('pendingBody')}</p>
          <Button disabled={account.busy} onClick={account.onCancelDeletion}>
            {t('cancel')}
          </Button>
        </div>
      ) : confirming ? (
        <div className="space-y-3 border border-danger/40 bg-danger/10 p-4">
          <p className="text-sm text-ink-50">
            {t('deletePrompt', { date: format.dateTime(new Date(now.getTime() + DELETION_GRACE_MS), DATE_TIME) })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              disabled={account.busy}
              onClick={() => {
                setConfirming(false);
                account.onRequestDeletion();
              }}
            >
              {t('deleteYes')}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {t('deleteKeep')}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" disabled={account.busy} onClick={() => setConfirming(true)}>
          {t('delete')}
        </Button>
      )}
    </Panel>
  );
}

export function LandingPage({ locale, edition, signup, account }: LandingPageProps) {
  const t = useTranslations();
  const screens = SCREENS.filter((entry) => entry !== 'account' || account);
  const [selected, setScreen] = useState<Screen>('quest');
  // Signing out while on the Account screen falls back to the first screen.
  const screen = screens.includes(selected) ? selected : 'quest';
  const tabs = useRef<Record<Screen, HTMLButtonElement | null>>({
    quest: null,
    log: null,
    rules: null,
    account: null,
    language: null,
  });
  const signupOpen = edition?.signupStatus === 'open';

  function select(next: Screen) {
    setScreen(next);
    tabs.current[next]?.focus();
  }

  // Game-menu keys: arrows move (and wrap), Home and End jump to the ends.
  function onMenuKey(event: KeyboardEvent) {
    const index = screens.indexOf(screen);
    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: screens.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(screens[(moves[event.key] + screens.length) % screens.length]);
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ink-950 text-ink-50 lg:h-dvh">
      {/* Stage lighting that drifts slowly behind the whole app: two warm glows,
          a cool one and a faint dot grid. */}
      <div data-testid="ambient" aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute -top-48 left-1/2 -ml-[30rem] h-[36rem] w-[60rem] animate-drift-a rounded-full bg-[radial-gradient(closest-side,rgb(124_77_255/0.22),transparent)]" />
        <div className="absolute -top-24 -right-40 h-[30rem] w-[30rem] animate-drift-b rounded-full bg-[radial-gradient(closest-side,rgb(198_244_50/0.07),transparent)]" />
        <div className="absolute top-1/2 -left-48 h-[32rem] w-[32rem] animate-drift-c rounded-full bg-[radial-gradient(closest-side,rgb(246_199_68/0.07),transparent)]" />
        <div className="absolute inset-0 animate-pan bg-[radial-gradient(rgb(255_255_255/0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)] bg-[size:24px_24px]" />
      </div>

      {/* HUD: who and when, always on screen. */}
      {/* On phones: brand and account on top, the edition chips below. */}
      <header className="relative flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-800/80 bg-ink-950/60 px-4 py-3 sm:px-6">
          <span className="group order-1 flex items-center gap-2 font-display text-xs font-bold tracking-wide uppercase sm:text-sm sm:tracking-wider">
            <span className="inline-flex group-hover:animate-wiggle">
              <Trophy />
            </span>
            {t('brand.name')}
          </span>
        <div className="order-3 flex w-full flex-wrap items-center gap-2 sm:order-2 sm:w-auto">
          {edition && (
            <span className="chamfer flex items-center gap-2 bg-lime-400/12 px-3 py-1.5 font-pixel text-[0.65rem] tracking-wider text-lime-300 uppercase [--cut:6px]">
              {signupOpen && (
                <span aria-hidden="true" className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping bg-lime-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 bg-lime-400" />
                </span>
              )}
              {signupOpen
                ? t('hero.eyebrow', { edition: edition.name })
                : t('hero.eyebrowClosed', { edition: edition.name })}
            </span>
          )}
          {edition && signupOpen && <Countdown closesAt={edition.signupClosesAt} />}
        </div>
        {account && (
          <div className="chamfer order-2 ml-auto flex animate-swap items-center gap-2 bg-ink-800/80 p-1 pl-1.5 [--cut:8px] sm:order-3">
            <Avatar name={account.user.displayName} src={account.user.avatarUrl} size={28} />
            <span className="hidden max-w-32 truncate font-display text-sm text-ink-200 sm:inline">
              {account.user.displayName}
            </span>
            <Button variant="ghost" onClick={account.onSignOut}>
              {t('signup.signOut')}
            </Button>
          </div>
        )}
      </header>

      {/* Title screen: the game title and its main menu on one side, the selected
          screen on the other. */}
      <main className="relative mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-[minmax(0,1fr)] content-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:content-center lg:gap-14 lg:py-4">
        <div className="flex flex-col gap-8">
          <h1
            className="animate-rise bg-gradient-to-br from-ink-50 from-40% to-gold-300 bg-clip-text font-display text-4xl leading-[1.02] font-bold tracking-tight text-balance text-transparent sm:text-5xl xl:text-6xl"
            style={stagger(0)}
          >
            {t('hero.title')}
          </h1>

          <div>
            <div
              role="tablist"
              aria-label={t('menu.label')}
              aria-orientation="vertical"
              onKeyDown={onMenuKey}
              className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
            >
              {screens.map((entry, index) => {
                const selected = entry === screen;
                return (
                  <button
                    key={entry}
                    ref={(element) => {
                      tabs.current[entry] = element;
                    }}
                    type="button"
                    role="tab"
                    id={`menu-${entry}`}
                    aria-selected={selected}
                    aria-controls="menu-screen"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => select(entry)}
                    style={stagger(index + 1)}
                    className={`group chamfer relative flex shrink-0 animate-rise items-center gap-3 py-1.5 pr-3 pl-2 text-left font-display text-base font-bold tracking-wider whitespace-nowrap uppercase transition-[color,background-color,padding] duration-150 [--cut:8px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime-300 lg:py-2 lg:pr-4 lg:text-2xl ${
                      selected
                        ? 'bg-lime-400/12 text-lime-300 lg:pl-4'
                        : 'text-ink-400 hover:bg-ink-800/60 hover:text-ink-50 lg:pl-3 lg:hover:pl-4'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`text-[0.6em] transition-opacity duration-150 ${
                        selected ? 'animate-blink text-lime-400' : 'opacity-0 group-hover:opacity-60'
                      }`}
                    >
                      ▶
                    </span>
                    <span>{t(`menu.${entry}`)}</span>
                  </button>
                );
              })}
            </div>
            <p aria-hidden="true" className="mt-4 hidden font-pixel text-[0.6rem] tracking-wider text-ink-400 uppercase lg:block">
              {t('menu.hint')}
            </p>
          </div>
        </div>

        <div
          role="tabpanel"
          id="menu-screen"
          aria-labelledby={`menu-${screen}`}
          tabIndex={0}
          className="min-h-0 animate-rise outline-none lg:max-h-full lg:overflow-y-auto"
          style={stagger(2)}
        >
          {/* Keyed by screen, so switching swaps the panel like a game menu. */}
          <div key={screen} className="animate-swap">
            {screen === 'quest' && <div id="judge-signup">{signup}</div>}

            {screen === 'log' && <QuestLog edition={edition} />}

            {screen === 'rules' && (
              <Panel cut={20} innerClassName="p-6 sm:p-8">
                <h2 className="mb-5 font-display text-2xl font-bold tracking-wide uppercase">{t('principles.title')}</h2>
                <ul className="space-y-5">
                  {PRINCIPLES.map((principle, index) => (
                    <li key={principle} style={stagger(index)} className="animate-rise border-l-2 border-lime-400/40 pl-4">
                      <span className="mb-1 block font-pixel text-[0.6rem] text-lime-400">#{index + 1}</span>
                      <h3 className="mb-1 font-display text-lg font-semibold">{t(`principles.${principle}.title`)}</h3>
                      <p className="text-sm leading-6 text-ink-400">{t(`principles.${principle}.body`)}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {screen === 'account' && account && <AccountScreen account={account} />}

            {screen === 'language' && (
              <Panel cut={20} innerClassName="p-6 sm:p-8">
                <h2 className="mb-5 font-display text-2xl font-bold tracking-wide uppercase">{t('menu.language')}</h2>
                <ul className="space-y-1">
                  {LOCALES.map(({ code, name }) => {
                    const current = code === locale;
                    return (
                      <li key={code}>
                        <a
                          // Always prefixed: the middleware remembers the chosen language in a
                          // cookie, and only a prefixed URL updates it ("/en" then redirects to "/").
                          href={`/${code}`}
                          hrefLang={code}
                          lang={code}
                          aria-current={current ? 'true' : undefined}
                          className={`group chamfer flex items-center gap-3 px-4 py-3 font-display text-lg font-semibold [--cut:8px] ${
                            current ? 'bg-lime-400/12 text-lime-300' : 'text-ink-200 hover:bg-ink-800/60 hover:text-ink-50'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`text-xs ${current ? 'text-lime-400' : 'opacity-0 group-hover:opacity-60'}`}
                          >
                            ▶
                          </span>
                          {name}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      </main>

      {/* Dialog bar: the pitch, read like a game's dialog box. */}
      <footer className="relative border-t border-ink-800/80 bg-ink-950/60 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <span aria-hidden="true" className="shrink-0 text-xs text-lime-400">
            ◆
          </span>
          <p className="flex-1 text-sm leading-6 text-ink-200">{t('hero.subtitle')}</p>
          <a
            href={localePath(locale, '/privacy')}
            className="shrink-0 font-pixel text-[0.6rem] tracking-wider text-ink-200 uppercase underline decoration-dotted underline-offset-4 hover:text-lime-300"
          >
            {t('footer.privacy')}
          </a>
          <span className="hidden shrink-0 font-pixel text-[0.6rem] tracking-wider text-ink-400 uppercase md:block">
            {t('footer.openSource')}
          </span>
          <span aria-hidden="true" className="shrink-0 animate-blink text-xs text-lime-400">
            ▼
          </span>
        </div>
      </footer>
    </div>
  );
}

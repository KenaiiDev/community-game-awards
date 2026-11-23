'use client';

import { useTranslations } from 'next-intl';
import { DEFAULT_LOCALE } from '@/i18n/locales';
import { ButtonLink } from '@/ui/Button';
import { Panel } from '@/ui/Panel';

/** Shown for any address that doesn't exist, in the visitor's language. */
export function NotFoundScreen({ locale }: { locale: string }) {
  const t = useTranslations('notFound');
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-ink-950 px-4 text-ink-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 animate-pan bg-[radial-gradient(rgb(255_255_255/0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] bg-[size:24px_24px]"
      />
      <Panel cut={20} className="relative w-full max-w-md animate-rise" innerClassName="p-8 text-center">
        <p className="mb-3 font-pixel text-[0.65rem] tracking-widest text-lime-400 uppercase">
          <span aria-hidden="true" className="mr-2 animate-blink">
            ◆
          </span>
          {t('label')}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-wide uppercase">{t('title')}</h1>
        <p className="mt-3 mb-8 text-sm leading-6 text-ink-200">{t('body')}</p>
        <ButtonLink href={locale === DEFAULT_LOCALE ? '/' : `/${locale}`}>{t('back')}</ButtonLink>
      </Panel>
    </main>
  );
}

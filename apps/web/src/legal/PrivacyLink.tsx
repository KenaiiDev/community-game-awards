'use client';

import { useLocale } from 'next-intl';
import type { ReactNode } from 'react';
import { localePath } from '@/i18n/paths';

/** Link to the privacy policy in the current language. */
export function PrivacyLink({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <a href={localePath(useLocale(), '/privacy')} className={`underline decoration-dotted underline-offset-4 hover:text-ink-50 ${className}`}>
      {children}
    </a>
  );
}

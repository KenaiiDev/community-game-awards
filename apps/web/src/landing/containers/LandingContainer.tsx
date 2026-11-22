'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from 'zustand';
import { createJudgeSignupApi, SIGN_IN_URL } from '@/judge-signup/api/judge-signup-api';
import { JudgeSignupCard } from '@/judge-signup/components/JudgeSignupCard';
import { createJudgeSignupStore, type AuthError } from '@/judge-signup/state/judge-signup.store';
import { LandingPage } from '../components/LandingPage';

function parseAuthError(value: string | null): AuthError | undefined {
  return value === 'state' || value === 'discord' ? value : undefined;
}

/** Wires the judge signup store to the presentational landing page. */
export function LandingContainer({ locale }: { locale: string }) {
  const [store] = useState(() => createJudgeSignupStore(createJudgeSignupApi()));
  const state = useStore(store);
  const authError = parseAuthError(useSearchParams().get('auth_error'));

  useEffect(() => {
    void store.getState().load({ authError });
  }, [store, authError]);

  const edition = 'edition' in state.view ? state.view.edition : null;

  return (
    <LandingPage
      locale={locale}
      edition={edition}
      signup={
        <JudgeSignupCard
          view={state.view}
          signInUrl={SIGN_IN_URL}
          onConsentChange={state.setConsent}
          onSubmit={() => void state.submit()}
          onSignOut={() => void state.signOut()}
          onRetry={() => void state.load()}
        />
      }
    />
  );
}

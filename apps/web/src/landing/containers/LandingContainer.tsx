'use client';

import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { createJudgeSignupApi, SIGN_IN_URL } from '@/judge-signup/api/judge-signup-api';
import { JudgeSignupCard } from '@/judge-signup/components/JudgeSignupCard';
import { createJudgeSignupStore, type AuthError } from '@/judge-signup/state/judge-signup.store';
import { LandingPage } from '../components/LandingPage';

/** Wires the judge signup store to the presentational landing page. */
export function LandingContainer({ locale, authError }: { locale: string; authError?: AuthError }) {
  const [store] = useState(() => createJudgeSignupStore(createJudgeSignupApi()));
  const state = useStore(store);

  useEffect(() => {
    void store.getState().load({ authError });
  }, [store, authError]);

  const edition = 'edition' in state.view ? state.view.edition : null;
  const account = state.account && {
    ...state.account,
    onSignOut: () => void state.signOut(),
    onRequestDeletion: () => void state.requestDeletion(),
    onCancelDeletion: () => void state.cancelDeletion(),
  };

  return (
    <LandingPage
      locale={locale}
      edition={edition}
      account={account}
      signup={
        <JudgeSignupCard
          view={state.view}
          signInUrl={SIGN_IN_URL}
          onConsentChange={state.setConsent}
          onSubmit={() => void state.submit()}
          onWithdraw={() => void state.withdraw()}
          onRetry={() => void state.load()}
        />
      }
    />
  );
}

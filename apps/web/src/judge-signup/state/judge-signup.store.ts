import { createStore } from 'zustand/vanilla';
import { ApiError, type JudgeSignupApi } from '../api/judge-signup-api';
import type { Application, Edition, PublicUser } from '../api/types';

export type AuthError = 'state' | 'discord';

/** Every screen the judge signup card can show. */
export type SignupView =
  | { kind: 'loading' }
  | { kind: 'load_error' }
  | { kind: 'no_edition' }
  | { kind: 'not_open'; edition: Edition }
  | { kind: 'closed'; edition: Edition }
  | { kind: 'signed_out'; edition: Edition; authError?: AuthError }
  | {
      kind: 'ready';
      edition: Edition;
      user: PublicUser;
      consent: boolean;
      submitting: boolean;
      error?: string;
    }
  | { kind: 'applied'; edition: Edition; user: PublicUser; application: Application };

export interface JudgeSignupState {
  view: SignupView;
  load(options?: { authError?: AuthError }): Promise<void>;
  setConsent(consent: boolean): void;
  submit(): Promise<void>;
  signOut(): Promise<void>;
}

export type JudgeSignupStore = ReturnType<typeof createJudgeSignupStore>;

export function createJudgeSignupStore(api: JudgeSignupApi) {
  return createStore<JudgeSignupState>()((set, get) => ({
    view: { kind: 'loading' },

    async load({ authError } = {}) {
      set({ view: { kind: 'loading' } });
      try {
        const [edition, me] = await Promise.all([api.getCurrentEdition(), api.getMe()]);
        if (me?.application) {
          set({ view: { kind: 'applied', edition, user: me.user, application: me.application } });
        } else if (edition.signupStatus !== 'open') {
          set({ view: { kind: edition.signupStatus, edition } });
        } else if (!me) {
          set({ view: authError ? { kind: 'signed_out', edition, authError } : { kind: 'signed_out', edition } });
        } else {
          set({ view: { kind: 'ready', edition, user: me.user, consent: false, submitting: false } });
        }
      } catch (error) {
        const noEdition = error instanceof ApiError && error.code === 'no_active_edition';
        set({ view: { kind: noEdition ? 'no_edition' : 'load_error' } });
      }
    },

    setConsent(consent) {
      const { view } = get();
      if (view.kind === 'ready') set({ view: { ...view, consent, error: undefined } });
    },

    async submit() {
      const { view } = get();
      if (view.kind !== 'ready' || !view.consent || view.submitting) return;
      set({ view: { ...view, submitting: true, error: undefined } });
      try {
        const application = await api.apply();
        set({ view: { kind: 'applied', edition: view.edition, user: view.user, application } });
      } catch (error) {
        const code = error instanceof ApiError ? error.code : 'unknown';
        set({ view: { ...view, submitting: false, error: code } });
      }
    },

    async signOut() {
      const { view } = get();
      await api.signOut();
      if ('edition' in view) set({ view: { kind: 'signed_out', edition: view.edition } });
    },
  }));
}

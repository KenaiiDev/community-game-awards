import { createStore } from 'zustand/vanilla';
import { ApiError, type JudgeSignupApi } from '../api/judge-signup-api';
import type { AccountDeletion, Application, Edition, PublicUser } from '../api/types';

export type AuthError = 'state' | 'discord' | 'rate_limited';

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
  | {
      kind: 'applied';
      edition: Edition;
      user: PublicUser;
      application: Application;
      withdrawing?: boolean;
      error?: string;
    };

/** The signed-in visitor, independent of what the signup card shows. */
export interface AccountState {
  user: PublicUser;
  deletion: AccountDeletion | null;
  busy: boolean;
  error?: string;
}

export interface JudgeSignupState {
  view: SignupView;
  account: AccountState | null;
  load(options?: { authError?: AuthError }): Promise<void>;
  setConsent(consent: boolean): void;
  submit(): Promise<void>;
  withdraw(): Promise<void>;
  signOut(): Promise<void>;
  requestDeletion(): Promise<void>;
  cancelDeletion(): Promise<void>;
}

export type JudgeSignupStore = ReturnType<typeof createJudgeSignupStore>;

export function createJudgeSignupStore(api: JudgeSignupApi) {
  return createStore<JudgeSignupState>()((set, get) => {
    /** Runs a deletion change for the signed-in account, tracking busy and errors. */
    async function changeDeletion(change: () => Promise<AccountDeletion | null>) {
      const { account } = get();
      if (!account || account.busy) return;
      set({ account: { user: account.user, deletion: account.deletion, busy: true } });
      try {
        const deletion = await change();
        set({ account: { user: account.user, deletion, busy: false } });
      } catch (error) {
        const code = error instanceof ApiError ? error.code : 'unknown';
        if (code === 'unauthenticated') {
          await get().load();
          return;
        }
        set({ account: { user: account.user, deletion: account.deletion, busy: false, error: code } });
      }
    }

    return {
      view: { kind: 'loading' },
      account: null,

      async load({ authError } = {}) {
        set({ view: { kind: 'loading' } });
        try {
          const [edition, me] = await Promise.all([api.getCurrentEdition(), api.getMe()]);
          set({ account: me ? { user: me.user, deletion: me.deletion, busy: false } : null });
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
          if (code === 'already_applied') {
            // Applied elsewhere (another tab or device): show the stored application.
            await get().load();
            return;
          }
          if (code === 'unauthenticated') {
            set({ view: { kind: 'signed_out', edition: view.edition } });
            return;
          }
          set({ view: { ...view, submitting: false, error: code } });
        }
      },

      async withdraw() {
        const { view } = get();
        if (view.kind !== 'applied' || view.withdrawing) return;
        set({ view: { ...view, withdrawing: true, error: undefined } });
        try {
          await api.withdraw();
          set({ view: { kind: 'ready', edition: view.edition, user: view.user, consent: false, submitting: false } });
        } catch (error) {
          const code = error instanceof ApiError ? error.code : 'unknown';
          if (code === 'not_applied') {
            // Already withdrawn elsewhere (another tab or device): show the real state.
            await get().load();
            return;
          }
          if (code === 'unauthenticated') {
            set({ view: { kind: 'signed_out', edition: view.edition } });
            return;
          }
          set({ view: { ...view, withdrawing: false, error: code } });
        }
      },

      async signOut() {
        const { view } = get();
        await api.signOut();
        set({ account: null });
        if ('edition' in view) set({ view: { kind: 'signed_out', edition: view.edition } });
      },

      async requestDeletion() {
        await changeDeletion(async () => api.requestDeletion());
      },

      async cancelDeletion() {
        await changeDeletion(async () => {
          await api.cancelDeletion();
          return null;
        });
      },
    };
  });
}

import { describe, expect, it } from 'vitest';
import { createJudgeSignupStore } from './judge-signup.store';
import { ApiError, type JudgeSignupApi } from '../api/judge-signup-api';
import type { Application, Edition, Me } from '../api/types';

const openEdition: Edition = {
  slug: 'express-2026',
  name: 'Express 2026',
  signupOpensAt: '2026-11-20T00:00:00.000Z',
  signupClosesAt: '2026-12-01T00:00:00.000Z',
  signupStatus: 'open',
};
const user = { username: 'kenaii', displayName: 'Kenaii', avatarUrl: null };
const application: Application = {
  editionSlug: 'express-2026',
  consentedAt: '2026-11-25T12:00:00.000Z',
  consentVersion: 'v1',
};

function fakeApi(overrides: Partial<JudgeSignupApi> = {}): JudgeSignupApi & { applyCalls: number } {
  const api = {
    applyCalls: 0,
    getCurrentEdition: async () => openEdition,
    getMe: async (): Promise<Me | null> => null,
    apply: async () => {
      api.applyCalls += 1;
      return application;
    },
    signOut: async () => {},
    withdraw: async () => {},
    ...overrides,
  };
  return api;
}

describe('judge signup store', () => {
  it('starts loading', () => {
    expect(createJudgeSignupStore(fakeApi()).getState().view).toEqual({ kind: 'loading' });
  });

  it('shows sign-in when signup is open and nobody is signed in', async () => {
    const store = createJudgeSignupStore(fakeApi());
    await store.getState().load();
    expect(store.getState().view).toEqual({ kind: 'signed_out', edition: openEdition });
  });

  it('carries the OAuth error from the redirect into the signed-out view', async () => {
    const store = createJudgeSignupStore(fakeApi());
    await store.getState().load({ authError: 'state' });
    expect(store.getState().view).toEqual({ kind: 'signed_out', edition: openEdition, authError: 'state' });
  });

  it('shows the consent form, unchecked, for a signed-in user without an application', async () => {
    const store = createJudgeSignupStore(fakeApi({ getMe: async () => ({ user, application: null }) }));
    await store.getState().load();
    expect(store.getState().view).toEqual({
      kind: 'ready',
      edition: openEdition,
      user,
      consent: false,
      submitting: false,
    });
  });

  it('shows the confirmation when the user already applied, even after the deadline', async () => {
    const store = createJudgeSignupStore(
      fakeApi({
        getCurrentEdition: async () => ({ ...openEdition, signupStatus: 'closed' }),
        getMe: async () => ({ user, application }),
      }),
    );
    await store.getState().load();
    expect(store.getState().view).toMatchObject({ kind: 'applied', application, user });
  });

  it.each(['closed', 'not_open'] as const)('shows %s signup to users who have not applied', async (status) => {
    const edition = { ...openEdition, signupStatus: status };
    const store = createJudgeSignupStore(fakeApi({ getCurrentEdition: async () => edition }));
    await store.getState().load();
    expect(store.getState().view).toEqual({ kind: status, edition });
  });

  it('shows "no edition" when the API has no active edition', async () => {
    const store = createJudgeSignupStore(
      fakeApi({ getCurrentEdition: async () => { throw new ApiError(404, 'no_active_edition'); } }),
    );
    await store.getState().load();
    expect(store.getState().view).toEqual({ kind: 'no_edition' });
  });

  it('shows a load error when the API is unreachable', async () => {
    const store = createJudgeSignupStore(
      fakeApi({ getCurrentEdition: async () => { throw new TypeError('fetch failed'); } }),
    );
    await store.getState().load();
    expect(store.getState().view).toEqual({ kind: 'load_error' });
  });

  it('does not submit without consent', async () => {
    const api = fakeApi({ getMe: async () => ({ user, application: null }) });
    const store = createJudgeSignupStore(api);
    await store.getState().load();

    await store.getState().submit();

    expect(api.applyCalls).toBe(0);
    expect(store.getState().view.kind).toBe('ready');
  });

  it('submits after consent and switches to the confirmation', async () => {
    const api = fakeApi({ getMe: async () => ({ user, application: null }) });
    const store = createJudgeSignupStore(api);
    await store.getState().load();

    store.getState().setConsent(true);
    expect(store.getState().view).toMatchObject({ kind: 'ready', consent: true });
    const pending = store.getState().submit();
    expect(store.getState().view).toMatchObject({ kind: 'ready', submitting: true });
    await pending;

    expect(api.applyCalls).toBe(1);
    expect(store.getState().view).toEqual({ kind: 'applied', edition: openEdition, user, application });
  });

  it('keeps the form and shows the API error code when submitting fails', async () => {
    const store = createJudgeSignupStore(
      fakeApi({
        getMe: async () => ({ user, application: null }),
        apply: async () => { throw new ApiError(403, 'signup_closed'); },
      }),
    );
    await store.getState().load();
    store.getState().setConsent(true);
    await store.getState().submit();

    expect(store.getState().view).toMatchObject({
      kind: 'ready',
      consent: true,
      submitting: false,
      error: 'signup_closed',
    });
  });

  it('shows the confirmation when the API says the user already applied (e.g. from another tab)', async () => {
    let applied = false;
    const store = createJudgeSignupStore(
      fakeApi({
        getMe: async () => ({ user, application: applied ? application : null }),
        apply: async () => {
          applied = true;
          throw new ApiError(409, 'already_applied');
        },
      }),
    );
    await store.getState().load();
    store.getState().setConsent(true);
    await store.getState().submit();

    expect(store.getState().view).toEqual({ kind: 'applied', edition: openEdition, user, application });
  });

  it('returns to sign-in when the session expired before submitting', async () => {
    const store = createJudgeSignupStore(
      fakeApi({
        getMe: async () => ({ user, application: null }),
        apply: async () => { throw new ApiError(401, 'unauthenticated'); },
      }),
    );
    await store.getState().load();
    store.getState().setConsent(true);
    await store.getState().submit();

    expect(store.getState().view).toEqual({ kind: 'signed_out', edition: openEdition });
  });

  it('maps unexpected submit failures to a generic error', async () => {
    const store = createJudgeSignupStore(
      fakeApi({
        getMe: async () => ({ user, application: null }),
        apply: async () => { throw new TypeError('fetch failed'); },
      }),
    );
    await store.getState().load();
    store.getState().setConsent(true);
    await store.getState().submit();

    expect(store.getState().view).toMatchObject({ kind: 'ready', error: 'unknown' });
  });

  it('signs out back to the sign-in view', async () => {
    const store = createJudgeSignupStore(fakeApi({ getMe: async () => ({ user, application: null }) }));
    await store.getState().load();

    await store.getState().signOut();

    expect(store.getState().view).toEqual({ kind: 'signed_out', edition: openEdition });
  });

  describe('withdrawing an application', () => {
    const applied = { getMe: async (): Promise<Me | null> => ({ user, application }) };

    it('returns to an unchecked consent form after withdrawing', async () => {
      let withdrawn = 0;
      const store = createJudgeSignupStore(fakeApi({ ...applied, withdraw: async () => void (withdrawn += 1) }));
      await store.getState().load();

      const pending = store.getState().withdraw();
      expect(store.getState().view).toMatchObject({ kind: 'applied', withdrawing: true });
      await pending;

      expect(withdrawn).toBe(1);
      expect(store.getState().view).toEqual({ kind: 'ready', edition: openEdition, user, consent: false, submitting: false });
    });

    it('keeps the application and shows why when signup already closed', async () => {
      const store = createJudgeSignupStore(
        fakeApi({ ...applied, withdraw: async () => { throw new ApiError(403, 'signup_closed'); } }),
      );
      await store.getState().load();
      await store.getState().withdraw();
      expect(store.getState().view).toMatchObject({ kind: 'applied', withdrawing: false, error: 'signup_closed' });
    });

    it('reloads when there was nothing to withdraw (e.g. withdrawn in another tab)', async () => {
      let me: Me | null = { user, application };
      const store = createJudgeSignupStore(
        fakeApi({ getMe: async () => me, withdraw: async () => { me = { user, application: null }; throw new ApiError(404, 'not_applied'); } }),
      );
      await store.getState().load();
      await store.getState().withdraw();
      expect(store.getState().view).toMatchObject({ kind: 'ready', consent: false });
    });

    it('returns to sign-in when the session expired', async () => {
      const store = createJudgeSignupStore(
        fakeApi({ ...applied, withdraw: async () => { throw new ApiError(401, 'unauthenticated'); } }),
      );
      await store.getState().load();
      await store.getState().withdraw();
      expect(store.getState().view).toEqual({ kind: 'signed_out', edition: openEdition });
    });
  });
});

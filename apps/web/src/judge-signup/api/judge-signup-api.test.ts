import { describe, expect, it } from 'vitest';
import { ApiError, createJudgeSignupApi, SIGN_IN_URL } from './judge-signup-api';

type Call = { url: string; init?: RequestInit };

function fakeFetch(status: number, body?: unknown) {
  const calls: Call[] = [];
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  return { fn, calls };
}

describe('judge signup API client', () => {
  it('points sign-in at the same-origin Discord OAuth route', () => {
    expect(SIGN_IN_URL).toBe('/api/auth/discord');
  });

  it('loads the current edition', async () => {
    const edition = { slug: 's', name: 'N', signupOpensAt: 'a', signupClosesAt: 'b', signupStatus: 'open' };
    const { fn, calls } = fakeFetch(200, edition);
    expect(await createJudgeSignupApi(fn).getCurrentEdition()).toEqual(edition);
    expect(calls[0].url).toBe('/api/editions/current');
  });

  it('returns null from getMe when not signed in (401)', async () => {
    const { fn } = fakeFetch(401, { code: 'unauthenticated' });
    expect(await createJudgeSignupApi(fn).getMe()).toBeNull();
  });

  it('posts explicit JSON consent and sends cookies', async () => {
    const created = { editionSlug: 's', consentedAt: 'd', consentVersion: 'v' };
    const { fn, calls } = fakeFetch(201, created);
    expect(await createJudgeSignupApi(fn).apply()).toEqual(created);
    expect(calls[0]).toMatchObject({
      url: '/api/judge-applications',
      init: { method: 'POST', credentials: 'same-origin', body: JSON.stringify({ consent: true }) },
    });
    expect(new Headers(calls[0].init?.headers).get('Content-Type')).toBe('application/json');
  });

  it('throws an ApiError with status and code for error responses', async () => {
    const { fn } = fakeFetch(409, { code: 'already_applied' });
    const error = await createJudgeSignupApi(fn).apply().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'already_applied' });
  });

  it('uses "unknown" as the code when the error body is not JSON', async () => {
    const fn = (async () => new Response('<html>bad gateway</html>', { status: 502 })) as typeof fetch;
    await expect(createJudgeSignupApi(fn).getCurrentEdition()).rejects.toMatchObject({
      status: 502,
      code: 'unknown',
    });
  });

  it('withdraws the current application with a DELETE', async () => {
    const { fn, calls } = fakeFetch(204);
    await createJudgeSignupApi(fn).withdraw();
    expect(calls[0]).toMatchObject({
      url: '/api/judge-applications/current',
      init: { method: 'DELETE', credentials: 'same-origin' },
    });
  });

  it('signs out with a POST', async () => {
    const { fn, calls } = fakeFetch(204);
    await createJudgeSignupApi(fn).signOut();
    expect(calls[0]).toMatchObject({ url: '/api/auth/logout', init: { method: 'POST' } });
  });
});

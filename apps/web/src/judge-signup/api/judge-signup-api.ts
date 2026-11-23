import type { AccountDeletion, Application, Edition, Me } from './types';

/** Same-origin path: Next.js rewrites /api/* to the Nest API, so cookies stay first-party. */
export const SIGN_IN_URL = '/api/auth/discord';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`API request failed with ${status} (${code})`);
  }
}

export interface JudgeSignupApi {
  getCurrentEdition(): Promise<Edition>;
  /** The signed-in user, or null when there is no valid session. */
  getMe(): Promise<Me | null>;
  apply(): Promise<Application>;
  /** Withdraws the signed-in user's application to the current edition. */
  withdraw(): Promise<void>;
  /** Schedules the deletion of the signed-in user's account and data. */
  requestDeletion(): Promise<AccountDeletion>;
  cancelDeletion(): Promise<void>;
  signOut(): Promise<void>;
}

async function errorCode(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { code?: unknown };
    return typeof body.code === 'string' ? body.code : 'unknown';
  } catch {
    return 'unknown';
  }
}

export function createJudgeSignupApi(fetchFn: typeof fetch = fetch): JudgeSignupApi {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetchFn(`/api${path}`, { credentials: 'same-origin', ...init });
    if (!res.ok) throw new ApiError(res.status, await errorCode(res));
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  return {
    getCurrentEdition: () => call<Edition>('/editions/current'),
    async getMe() {
      try {
        return await call<Me>('/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    apply: () =>
      call<Application>('/judge-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true }),
      }),
    withdraw: () => call<void>('/judge-applications/current', { method: 'DELETE' }),
    requestDeletion: () => call<AccountDeletion>('/me/deletion', { method: 'POST' }),
    cancelDeletion: () => call<void>('/me/deletion', { method: 'DELETE' }),
    signOut: () => call<void>('/auth/logout', { method: 'POST' }),
  };
}

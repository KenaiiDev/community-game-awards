import type { AuthError } from './judge-signup.store';

/** Accepts only the OAuth error codes the API sends back; anything else is ignored. */
export function parseAuthError(value: unknown): AuthError | undefined {
  return value === 'state' || value === 'discord' || value === 'rate_limited' ? value : undefined;
}

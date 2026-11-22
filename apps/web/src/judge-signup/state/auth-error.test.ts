import { describe, expect, it } from 'vitest';
import { parseAuthError } from './auth-error';

describe('parseAuthError', () => {
  it.each(['state', 'discord'] as const)('accepts the known code "%s"', (code) => {
    expect(parseAuthError(code)).toBe(code);
  });

  it.each([undefined, '', 'other', ['state'], '<script>'])('ignores %j', (value) => {
    expect(parseAuthError(value)).toBeUndefined();
  });
});

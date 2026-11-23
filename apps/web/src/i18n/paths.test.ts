import { describe, expect, it } from 'vitest';
import { localePath } from './paths';

describe('localePath', () => {
  it('keeps English at the root', () => {
    expect(localePath('en')).toBe('/');
    expect(localePath('en', '/privacy')).toBe('/privacy');
  });

  it('prefixes other languages', () => {
    expect(localePath('es')).toBe('/es');
    expect(localePath('es', '/privacy')).toBe('/es/privacy');
  });
});

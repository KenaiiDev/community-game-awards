import { describe, expect, it } from 'vitest';
import en from './en.json';
import es from './es.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('translations', () => {
  it('Spanish defines exactly the same keys as English (the default)', () => {
    expect(keys(es).sort()).toEqual(keys(en).sort());
  });

  it('has no empty strings', () => {
    for (const messages of [en, es]) {
      const flat = keys(messages);
      expect(flat.length).toBeGreaterThan(0);
      for (const key of flat) {
        const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], messages);
        expect(value, key).not.toBe('');
      }
    }
  });
});

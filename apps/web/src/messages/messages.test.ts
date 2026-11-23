// Guards community translations. Adding a language = one JSON file in this folder
// plus one entry in src/i18n/locales.ts. A translation may be partial (missing keys
// fall back to English) but may never invent keys or break placeholders.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/locales';

type Messages = { [key: string]: string | Messages };

const dir = path.dirname(new URL(import.meta.url).pathname);
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const load = (code: string) => JSON.parse(readFileSync(path.join(dir, `${code}.json`), 'utf8')) as Messages;

function flatten(obj: Messages, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [nk, nv] of flatten(v, `${prefix}${k}.`)) out.set(nk, nv);
    } else {
      out.set(`${prefix}${k}`, v);
    }
  }
  return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const english = flatten(load(DEFAULT_LOCALE));

describe('locale registry', () => {
  it('registers every translation file and has a file for every registered language', () => {
    expect(files.map((f) => f.replace(/\.json$/, '')).sort()).toEqual(LOCALES.map((l) => l.code).sort());
  });

  it('uses English as the default and lists it first', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(LOCALES[0].code).toBe('en');
  });

  it('gives every language a unique code and a native name', () => {
    const codes = LOCALES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const locale of LOCALES) {
      expect(locale.code).toMatch(/^[a-z]{2,3}(-[A-Z]{2})?$/);
      expect(locale.name.trim()).not.toBe('');
    }
  });
});

describe('English (source of every translation)', () => {
  it('has only non-empty string values', () => {
    expect(english.size).toBeGreaterThan(0);
    for (const [key, value] of english) {
      expect(typeof value, key).toBe('string');
      expect(value, key).not.toBe('');
    }
  });
});

describe.each(LOCALES.filter((l) => l.code !== DEFAULT_LOCALE))('$name ($code) translation', ({ code }) => {
  const translated = flatten(load(code));

  it('only uses keys that exist in English (no typos, no stale keys)', () => {
    const unknown = [...translated.keys()].filter((key) => !english.has(key));
    expect(unknown).toEqual([]);
  });

  it('has only non-empty string values (omit a key instead to fall back to English)', () => {
    for (const [key, value] of translated) {
      expect(typeof value, key).toBe('string');
      expect(value, key).not.toBe('');
    }
  });

  it('keeps the same {placeholders} as English', () => {
    for (const [key, value] of translated) {
      const source = english.get(key);
      if (typeof value !== 'string' || typeof source !== 'string') continue;
      expect(placeholders(value), key).toEqual(placeholders(source));
    }
  });
});

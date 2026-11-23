import { describe, expect, it } from 'vitest';
import { withFallback } from './fallback';

describe('withFallback', () => {
  const english = {
    brand: { name: 'Community Game Awards' },
    hero: { title: 'Title', cta: 'Apply' },
    footer: { openSource: 'Open source' },
  };

  it('keeps translated keys and fills missing ones from English, at any depth', () => {
    const partial = { hero: { title: 'Título' } };

    expect(withFallback(english, partial)).toEqual({
      brand: { name: 'Community Game Awards' },
      hero: { title: 'Título', cta: 'Apply' },
      footer: { openSource: 'Open source' },
    });
  });

  it('returns English unchanged for an empty translation', () => {
    expect(withFallback(english, {})).toEqual(english);
  });

  it('does not mutate its inputs', () => {
    const partial = { hero: { title: 'Título' } };
    withFallback(english, partial);
    expect(english.hero.title).toBe('Title');
    expect(partial).toEqual({ hero: { title: 'Título' } });
  });
});

import { FixedWindowCounter } from './fixed-window-counter.js';

const MINUTE = 60_000;

describe('FixedWindowCounter', () => {
  it('counts hits for a key within its window and reports when the window resets', () => {
    const counter = new FixedWindowCounter();
    expect(counter.hit('a', MINUTE, 1_000)).toEqual({ count: 1, resetAt: 61_000 });
    expect(counter.hit('a', MINUTE, 30_000)).toEqual({ count: 2, resetAt: 61_000 });
  });

  it('keeps keys apart', () => {
    const counter = new FixedWindowCounter();
    counter.hit('a', MINUTE, 0);
    counter.hit('a', MINUTE, 0);
    expect(counter.hit('b', MINUTE, 0).count).toBe(1);
  });

  it('starts a new window once the previous one has ended', () => {
    const counter = new FixedWindowCounter();
    counter.hit('a', MINUTE, 0);
    counter.hit('a', MINUTE, 59_999);
    expect(counter.hit('a', MINUTE, 60_000)).toEqual({ count: 1, resetAt: 120_000 });
  });

  it('forgets ended windows when swept, so memory does not grow with every visitor', () => {
    const counter = new FixedWindowCounter();
    counter.hit('old', MINUTE, 0);
    counter.hit('live', MINUTE, 50_000);
    counter.sweep(60_000);
    expect(counter.size).toBe(1);
    expect(counter.hit('live', MINUTE, 60_000).count).toBe(2);
  });
});

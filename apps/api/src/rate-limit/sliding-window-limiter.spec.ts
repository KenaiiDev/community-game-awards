import { SlidingWindowLimiter } from './sliding-window-limiter.js';

const rule = { ttl: 60_000, limit: 10 };

/** Hits `key` `times` times at `now` and returns how many were allowed. */
function allowedOf(limiter: SlidingWindowLimiter, key: string, times: number, now: number) {
  let allowed = 0;
  for (let i = 0; i < times; i++) if (limiter.hit(key, rule, now).allowed) allowed++;
  return allowed;
}

describe('SlidingWindowLimiter', () => {
  it('allows up to the limit and refuses the next hit with a full block as Retry-After', () => {
    const limiter = new SlidingWindowLimiter();
    expect(allowedOf(limiter, 'a', 10, 0)).toBe(10);
    expect(limiter.hit('a', rule, 0)).toEqual({ allowed: false, retryAfterMs: 60_000 });
  });

  it('never allows more than the limit within any rolling window, even across a window edge', () => {
    const limiter = new SlidingWindowLimiter();
    let allowed = allowedOf(limiter, 'a', 1, 0);
    allowed += allowedOf(limiter, 'a', 9, 59_000);
    // Only the hit at t=0 has expired by t=60s: one more is allowed, then the block starts.
    allowed += allowedOf(limiter, 'a', 10, 60_000);
    expect(allowed).toBe(11);
  });

  it('keeps a client blocked for the whole block after going over, counting down Retry-After', () => {
    const limiter = new SlidingWindowLimiter();
    allowedOf(limiter, 'a', 11, 0);
    expect(limiter.hit('a', rule, 30_000)).toEqual({ allowed: false, retryAfterMs: 30_000 });
    expect(limiter.hit('a', rule, 59_999).allowed).toBe(false);
  });

  it('starts from a clean slate once the block has ended', () => {
    const limiter = new SlidingWindowLimiter();
    allowedOf(limiter, 'a', 11, 0);
    expect(allowedOf(limiter, 'a', 10, 60_000)).toBe(10);
    expect(limiter.hit('a', rule, 60_000).allowed).toBe(false);
  });

  it('lets hits expire one by one, so a steady client is not blocked', () => {
    const limiter = new SlidingWindowLimiter();
    for (let t = 0; t < 10 * 60_000; t += 6_000) expect(limiter.hit('a', rule, t).allowed).toBe(true);
  });

  it('keeps keys apart', () => {
    const limiter = new SlidingWindowLimiter();
    allowedOf(limiter, 'a', 11, 0);
    expect(limiter.hit('b', rule, 0).allowed).toBe(true);
  });

  it('forgets idle and unblocked clients when swept, so memory does not grow with every visitor', () => {
    const limiter = new SlidingWindowLimiter();
    limiter.hit('idle', rule, 0);
    allowedOf(limiter, 'blocked', 11, 30_000);
    limiter.hit('live', rule, 50_000);
    limiter.sweep(60_000);
    expect(limiter.size).toBe(2);
    expect(limiter.hit('blocked', rule, 60_000).allowed).toBe(false);
  });
});

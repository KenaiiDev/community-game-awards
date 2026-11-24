export interface WindowHit {
  /** Hits for the key in the current window, this one included. */
  count: number;
  /** When the current window ends (epoch ms). */
  resetAt: number;
}

/**
 * Fixed-window hit counter kept in memory. The first hit for a key opens a window
 * of `ttl` ms; hits count until it ends, and the next hit opens a new one.
 */
export class FixedWindowCounter {
  private readonly windows = new Map<string, WindowHit>();

  hit(key: string, ttl: number, now: number): WindowHit {
    const current = this.windows.get(key);
    const window = current && now < current.resetAt ? current : { count: 0, resetAt: now + ttl };
    window.count += 1;
    this.windows.set(key, window);
    return { ...window };
  }

  /** Drops the windows that have ended. */
  sweep(now: number): void {
    for (const [key, window] of this.windows) {
      if (now >= window.resetAt) this.windows.delete(key);
    }
  }

  get size(): number {
    return this.windows.size;
  }
}

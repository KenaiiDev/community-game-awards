import type { RateLimitRule } from './rate-limit.decorators.js';

export interface LimitDecision {
  allowed: boolean;
  /** When refused: ms until the client may try again. 0 when allowed. */
  retryAfterMs: number;
}

interface ClientLog {
  /** Times of the allowed hits still inside the window, oldest first. */
  hits: number[];
  ttl: number;
  /** While in the future, every hit is refused. 0 when not blocked. */
  blockedUntil: number;
}

/**
 * In-memory sliding-window limiter, the same semantics @nestjs/throttler had:
 * every hit expires on its own `ttl` after it happened, so no rolling window ever
 * allows more than `limit`; going over blocks the client for a full `ttl`, and the
 * block ending starts it from a clean slate.
 */
export class SlidingWindowLimiter {
  private readonly clients = new Map<string, ClientLog>();

  hit(key: string, rule: RateLimitRule, now: number): LimitDecision {
    const log = this.clients.get(key) ?? { hits: [], ttl: rule.ttl, blockedUntil: 0 };
    this.clients.set(key, log);
    if (log.blockedUntil > now) return { allowed: false, retryAfterMs: log.blockedUntil - now };
    if (log.blockedUntil) {
      log.hits = [];
      log.blockedUntil = 0;
    }
    log.ttl = rule.ttl;
    while (log.hits.length && log.hits[0] <= now - rule.ttl) log.hits.shift();
    if (log.hits.length >= rule.limit) {
      log.blockedUntil = now + rule.ttl;
      return { allowed: false, retryAfterMs: rule.ttl };
    }
    log.hits.push(now);
    return { allowed: true, retryAfterMs: 0 };
  }

  /** Forgets clients that are neither blocked nor holding a live hit. */
  sweep(now: number): void {
    for (const [key, log] of this.clients) {
      const lastHit = log.hits.at(-1) ?? -Infinity;
      if (log.blockedUntil <= now && lastHit <= now - log.ttl) this.clients.delete(key);
    }
  }

  get size(): number {
    return this.clients.size;
  }
}

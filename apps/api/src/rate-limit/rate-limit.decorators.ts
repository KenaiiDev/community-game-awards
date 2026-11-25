import { Reflector } from '@nestjs/core';

export interface RateLimitRule {
  /** Window length in ms. */
  ttl: number;
  /** Requests allowed per client per window. */
  limit: number;
}

/** Overrides the default limit for a route or a whole controller. */
export const RateLimit = Reflector.createDecorator<RateLimitRule>();

/** Exempts a route or a whole controller from rate limiting. */
export const SkipRateLimit = Reflector.createDecorator<true>({ transform: () => true });

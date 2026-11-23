/** Thrown when a client exceeds its rate limit; mapped by RateLimitedFilter. */
export class RateLimitedError extends Error {
  readonly code = 'rate_limited';
  constructor() {
    super('Too many requests. Please wait a minute and try again.');
  }
}

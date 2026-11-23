/**
 * Requests per client per minute. Reads are generous (each page load makes two),
 * sign-in and writes are tight because they are the abuse targets.
 */
export const RATE_LIMITS = {
  default: { ttl: 60_000, limit: 120 },
  auth: { ttl: 60_000, limit: 10 },
  write: { ttl: 60_000, limit: 10 },
} as const;

import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ClientIpRateLimitGuard } from './client-ip-rate-limit.guard.js';
import { RateLimitedFilter } from './rate-limited.filter.js';

// In-memory counters: per server instance. On serverless this is a best-effort
// limit; a shared store (e.g. Redis) would make it exact across instances.
@Module({
  providers: [
    { provide: APP_GUARD, useClass: ClientIpRateLimitGuard },
    { provide: APP_FILTER, useClass: RateLimitedFilter },
  ],
})
export class RateLimitModule {}

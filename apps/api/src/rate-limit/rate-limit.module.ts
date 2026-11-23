import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClientIpThrottlerGuard } from './client-ip-throttler.guard.js';
import { RateLimitedFilter } from './rate-limited.filter.js';
import { RATE_LIMITS } from './rate-limits.js';

// In-memory counters: per server instance. On serverless this is a best-effort
// limit; a shared store (e.g. Redis) would make it exact across instances.
@Module({
  imports: [ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ...RATE_LIMITS.default }] })],
  providers: [
    { provide: APP_GUARD, useClass: ClientIpThrottlerGuard },
    { provide: APP_FILTER, useClass: RateLimitedFilter },
  ],
})
export class RateLimitModule {}

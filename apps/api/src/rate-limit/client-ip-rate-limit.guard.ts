import { Inject, Injectable, type CanActivate, type ExecutionContext, type OnModuleDestroy } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { FixedWindowCounter } from './fixed-window-counter.js';
import { RateLimit, SkipRateLimit } from './rate-limit.decorators.js';
import { RateLimitedError } from './rate-limited.error.js';
import { RATE_LIMITS } from './rate-limits.js';

/** How often ended windows are dropped from memory. */
const SWEEP_EVERY_MS = 60_000;

function sameValue(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Limits each visitor per route. Behind the web app's proxy every request arrives
 * from the proxy, so the proxy forwards the visitor's IP in `x-client-ip` together
 * with a shared secret. Without the right secret that header is ignored, so a
 * client cannot dodge the limit by inventing IPs.
 */
@Injectable()
export class ClientIpRateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly counter = new FixedWindowCounter();
  private readonly sweeper = setInterval(() => this.counter.sweep(Date.now()), SWEEP_EVERY_MS).unref();

  constructor(
    private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride(SkipRateLimit, targets)) return true;
    const rule = this.reflector.getAllAndOverride(RateLimit, targets) ?? RATE_LIMITS.default;

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const now = Date.now();
    const { count, resetAt } = this.counter.hit(`${route}:${this.tracker(req)}`, rule.ttl, now);
    if (count <= rule.limit) return true;

    http.getResponse<Response>().setHeader('Retry-After', String(Math.max(1, Math.ceil((resetAt - now) / 1000))));
    throw new RateLimitedError();
  }

  onModuleDestroy() {
    clearInterval(this.sweeper);
  }

  private tracker(req: Request): string {
    const secret = req.header('x-proxy-secret');
    const forwarded = req.header('x-client-ip');
    if (this.config.proxySecret && secret && forwarded && sameValue(secret, this.config.proxySecret)) {
      return forwarded;
    }
    return req.ip ?? 'unknown';
  }
}

import { Inject, Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { RateLimitedError } from './rate-limited.error.js';

function sameValue(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Limits per visitor. Behind the web app's proxy every request arrives from the
 * proxy, so the proxy forwards the visitor's IP in `x-client-ip` together with a
 * shared secret. Without the right secret that header is ignored, so a client
 * cannot dodge the limit by inventing IPs.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    super(options, storage, reflector);
  }

  protected override async getTracker(req: Request): Promise<string> {
    const secret = req.header('x-proxy-secret');
    const forwarded = req.header('x-client-ip');
    if (this.config.proxySecret && secret && forwarded && sameValue(secret, this.config.proxySecret)) {
      return forwarded;
    }
    return req.ip ?? 'unknown';
  }

  protected override async throwThrottlingException(_context: ExecutionContext): Promise<void> {
    throw new RateLimitedError();
  }
}

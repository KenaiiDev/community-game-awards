import { Controller, Delete, Get, HttpCode, Inject, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { USER_REPOSITORY, type UserRepository } from '../../auth/application/ports.js';
import { SessionGuard, type AuthenticatedRequest } from '../../auth/infrastructure/session.guard.js';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import { CLOCK, type Clock } from '../../judge-applications/application/ports.js';
import { RATE_LIMITS } from '../../rate-limit/rate-limits.js';
import {
  CancelAccountDeletion,
  PurgeDeletedAccounts,
  RequestAccountDeletion,
} from '../application/account-deletion.use-cases.js';

function sameValue(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

@Controller()
export class AccountController {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('me/deletion')
  @HttpCode(202)
  @UseGuards(SessionGuard)
  @Throttle({ default: RATE_LIMITS.write })
  async requestDeletion(@Req() req: AuthenticatedRequest) {
    if (!(await this.users.findById(req.userId))) throw new UnauthorizedException({ code: 'unauthenticated' });
    const { scheduledFor } = await new RequestAccountDeletion(this.users, this.clock).execute({ userId: req.userId });
    return { scheduledFor: scheduledFor.toISOString() };
  }

  @Delete('me/deletion')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  @Throttle({ default: RATE_LIMITS.write })
  async cancelDeletion(@Req() req: AuthenticatedRequest) {
    await new CancelAccountDeletion(this.users).execute({ userId: req.userId });
  }

  /** Called once a day by Vercel Cron with `Authorization: Bearer <CRON_SECRET>`. */
  @Get('internal/purge-deleted-accounts')
  @SkipThrottle()
  async purge(@Req() req: Request) {
    const header = req.header('authorization') ?? '';
    const expected = this.config.cronSecret ? `Bearer ${this.config.cronSecret}` : null;
    if (!expected || !sameValue(header, expected)) throw new UnauthorizedException({ code: 'unauthorized' });
    return { deleted: await new PurgeDeletedAccounts(this.users, this.clock).execute() };
  }
}

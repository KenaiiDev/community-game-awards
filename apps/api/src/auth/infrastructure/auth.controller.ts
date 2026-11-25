import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { RateLimit } from '../../rate-limit/rate-limit.decorators.js';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import {
  DISCORD_OAUTH,
  SESSION_TOKENS,
  USER_REPOSITORY,
  type DiscordOAuth,
  type SessionTokens,
  type UserRepository,
} from '../application/ports.js';
import { SignInWithDiscord } from '../application/sign-in-with-discord.use-case.js';
import { SESSION_TTL_SECONDS } from './jose-session-tokens.js';
import { SESSION_COOKIE } from './session.guard.js';
import { RATE_LIMITS } from '../../rate-limit/rate-limits.js';

const STATE_COOKIE = 'oauth_state';
const STATE_TTL_MS = 10 * 60 * 1000;

function sameValue(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DISCORD_OAUTH) private readonly discord: DiscordOAuth,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SESSION_TOKENS) private readonly tokens: SessionTokens,
  ) {}

  private cookieOptions(maxAgeMs: number): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', secure: this.config.cookieSecure, path: '/', maxAge: maxAgeMs };
  }

  @Get('discord')
  @RateLimit(RATE_LIMITS.auth)
  start(@Res() res: Response) {
    const state = randomBytes(32).toString('base64url');
    res.cookie(STATE_COOKIE, state, this.cookieOptions(STATE_TTL_MS));
    res.redirect(302, this.discord.authorizeUrl(state));
  }

  @Get('discord/callback')
  @RateLimit(RATE_LIMITS.auth)
  async callback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
  ) {
    const expected = (req.cookies as Record<string, string> | undefined)?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { path: '/' });
    // A missing state cookie usually means the 10-minute window expired; send the
    // user back to the web app with a readable error instead of a raw 400.
    if (!expected || !state || !sameValue(expected, state)) {
      res.redirect(302, `${this.config.webUrl}/?auth_error=state`);
      return;
    }

    if (!code) {
      res.redirect(302, `${this.config.webUrl}/?auth_error=discord`);
      return;
    }

    try {
      const user = await new SignInWithDiscord(this.discord, this.users).execute(code);
      res.cookie(SESSION_COOKIE, await this.tokens.sign(user.id), this.cookieOptions(SESSION_TTL_SECONDS * 1000));
      res.redirect(302, `${this.config.webUrl}/`);
    } catch (error) {
      this.logger.warn(`Discord sign-in failed: ${(error as Error).message}`);
      res.redirect(302, `${this.config.webUrl}/?auth_error=discord`);
    }
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }
}

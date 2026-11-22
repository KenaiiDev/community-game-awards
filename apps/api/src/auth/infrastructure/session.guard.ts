import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SESSION_TOKENS, type SessionTokens } from '../application/ports.js';

export const SESSION_COOKIE = 'session';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(SESSION_TOKENS) private readonly tokens: SessionTokens) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    const userId = token ? await this.tokens.verify(token) : null;
    if (!userId) throw new UnauthorizedException({ code: 'unauthenticated' });
    req.userId = userId;
    return true;
  }
}

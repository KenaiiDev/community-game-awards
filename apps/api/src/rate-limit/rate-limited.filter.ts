import { Catch, Inject, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { RateLimitedError } from './rate-limited.error.js';

@Catch(RateLimitedError)
export class RateLimitedFilter implements ExceptionFilter {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  catch(error: RateLimitedError, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    // Sign-in is a browser navigation, not a fetch: send the visitor back to the
    // app with an error it can show instead of a bare JSON page.
    if (req.method === 'GET' && req.path.startsWith('/auth/discord')) {
      res.redirect(302, `${this.config.webUrl}/?auth_error=rate_limited`);
      return;
    }
    res.status(429).json({ code: error.code, message: error.message });
  }
}

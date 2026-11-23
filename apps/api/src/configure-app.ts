import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { APP_CONFIG, type AppConfig } from './config/app-config.js';

/** Middleware shared by the real server and the e2e tests. */
export function configureApp(app: INestApplication): void {
  const config = app.get<AppConfig>(APP_CONFIG);
  // Behind Vercel, req.ip comes from X-Forwarded-For, which the platform sets.
  (app as NestExpressApplication).set('trust proxy', config.trustProxy);
  app.use(cookieParser());
}

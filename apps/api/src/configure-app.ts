import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/** Middleware shared by the real server and the e2e tests. */
export function configureApp(app: INestApplication): void {
  app.use(cookieParser());
}

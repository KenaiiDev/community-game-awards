import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(process.env.PORT ?? 4000);
}
// Vercel detects this conventional bootstrap() that calls app.listen() and serves it
// as a single function; keep this shape (no top-level await).
void bootstrap();

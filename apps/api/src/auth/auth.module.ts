import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { DISCORD_OAUTH, SESSION_TOKENS, USER_REPOSITORY } from './application/ports.js';
import { AuthController } from './infrastructure/auth.controller.js';
import { DiscordHttpOAuth } from './infrastructure/discord-http-oauth.js';
import { JoseSessionTokens } from './infrastructure/jose-session-tokens.js';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository.js';
import { SessionGuard } from './infrastructure/session.guard.js';

@Module({
  controllers: [AuthController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    {
      provide: DISCORD_OAUTH,
      inject: [APP_CONFIG],
      useFactory: ({ discord }: AppConfig) =>
        new DiscordHttpOAuth(discord.clientId, discord.clientSecret, discord.redirectUri),
    },
    {
      provide: SESSION_TOKENS,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => new JoseSessionTokens(config.sessionSecret),
    },
    SessionGuard,
  ],
  exports: [USER_REPOSITORY, SESSION_TOKENS, SessionGuard],
})
export class AuthModule {}

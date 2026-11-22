import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { ConfigModule } from './config/config.module.js';
import { JudgeApplicationsModule } from './judge-applications/judge-applications.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, JudgeApplicationsModule],
})
export class AppModule {}

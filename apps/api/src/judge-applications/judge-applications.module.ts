import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module.js';
import { CLOCK, EDITION_REPOSITORY, JUDGE_APPLICATION_REPOSITORY } from './application/ports.js';
import { JudgeApplicationErrorFilter } from './infrastructure/judge-application-error.filter.js';
import { JudgeApplicationsController } from './infrastructure/judge-applications.controller.js';
import { PrismaEditionRepository } from './infrastructure/prisma-edition.repository.js';
import { PrismaJudgeApplicationRepository } from './infrastructure/prisma-judge-application.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [JudgeApplicationsController],
  providers: [
    { provide: EDITION_REPOSITORY, useClass: PrismaEditionRepository },
    { provide: JUDGE_APPLICATION_REPOSITORY, useClass: PrismaJudgeApplicationRepository },
    { provide: CLOCK, useValue: { now: () => new Date() } },
    { provide: APP_FILTER, useClass: JudgeApplicationErrorFilter },
  ],
})
export class JudgeApplicationsModule {}

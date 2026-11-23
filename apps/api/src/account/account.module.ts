import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CLOCK } from '../judge-applications/application/ports.js';
import { AccountController } from './infrastructure/account.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [AccountController],
  providers: [{ provide: CLOCK, useValue: { now: () => new Date() } }],
})
export class AccountModule {}

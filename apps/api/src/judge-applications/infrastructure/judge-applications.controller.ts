import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { USER_REPOSITORY, type UserRepository } from '../../auth/application/ports.js';
import { SessionGuard, type AuthenticatedRequest } from '../../auth/infrastructure/session.guard.js';
import { ApplyAsJudge } from '../application/apply-as-judge.use-case.js';
import { WithdrawApplication } from '../application/withdraw-application.use-case.js';
import {
  CLOCK,
  EDITION_REPOSITORY,
  JUDGE_APPLICATION_REPOSITORY,
  type Clock,
  type EditionRepository,
  type JudgeApplicationRepository,
} from '../application/ports.js';
import { signupStatus, type Edition } from '../domain/edition.js';
import { NoActiveEditionError } from '../domain/errors.js';
import type { JudgeApplication } from '../domain/judge-application.js';

function applicationView(application: JudgeApplication, edition: Edition) {
  return {
    editionSlug: edition.slug,
    consentedAt: application.consentedAt.toISOString(),
    consentVersion: application.consentVersion,
  };
}

@Controller()
export class JudgeApplicationsController {
  constructor(
    @Inject(EDITION_REPOSITORY) private readonly editions: EditionRepository,
    @Inject(JUDGE_APPLICATION_REPOSITORY) private readonly applications: JudgeApplicationRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Get('editions/current')
  async currentEdition() {
    const edition = await this.editions.findActive(this.clock.now());
    if (!edition) throw new NoActiveEditionError();
    return {
      slug: edition.slug,
      name: edition.name,
      signupOpensAt: edition.signupOpensAt.toISOString(),
      signupClosesAt: edition.signupClosesAt.toISOString(),
      signupStatus: signupStatus(edition, this.clock.now()),
    };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Req() req: AuthenticatedRequest) {
    const user = await this.users.findById(req.userId);
    if (!user) throw new UnauthorizedException({ code: 'unauthenticated' });
    const edition = await this.editions.findActive(this.clock.now());
    const application = edition
      ? await this.applications.findByUserAndEdition(user.id, edition.id)
      : null;
    return {
      user: { username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
      application: application && edition ? applicationView(application, edition) : null,
    };
  }

  @Post('judge-applications')
  @HttpCode(201)
  @UseGuards(SessionGuard)
  async apply(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const consent = (body as { consent?: unknown } | null)?.consent === true;
    const application = await new ApplyAsJudge(this.editions, this.applications, this.clock).execute({
      userId: req.userId,
      consent,
    });
    const edition = (await this.editions.findActive(this.clock.now()))!;
    return applicationView(application, edition);
  }

  @Delete('judge-applications/current')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async withdraw(@Req() req: AuthenticatedRequest) {
    await new WithdrawApplication(this.editions, this.applications, this.clock).execute({ userId: req.userId });
  }
}

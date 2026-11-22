import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { JudgeApplicationError } from '../domain/errors.js';

const STATUS_BY_CODE: Record<string, number> = {
  consent_required: 400,
  already_applied: 409,
  signup_not_open: 403,
  signup_closed: 403,
  no_active_edition: 404,
};

@Catch(JudgeApplicationError)
export class JudgeApplicationErrorFilter implements ExceptionFilter {
  catch(error: JudgeApplicationError, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(STATUS_BY_CODE[error.code] ?? 400)
      .json({ code: error.code, message: error.message });
  }
}

export abstract class JudgeApplicationError extends Error {
  abstract readonly code: string;
}

export class ConsentRequiredError extends JudgeApplicationError {
  readonly code = 'consent_required';
  constructor() {
    super('Explicit consent to a public judge identity is required');
  }
}

export class AlreadyAppliedError extends JudgeApplicationError {
  readonly code = 'already_applied';
  constructor() {
    super('This account already applied to the current edition');
  }
}

export class NotAppliedError extends JudgeApplicationError {
  readonly code = 'not_applied';
  constructor() {
    super('This account has no application to the current edition');
  }
}

export class SignupNotOpenError extends JudgeApplicationError {
  readonly code = 'signup_not_open';
  constructor() {
    super('Judge signup has not opened yet');
  }
}

export class SignupClosedError extends JudgeApplicationError {
  readonly code = 'signup_closed';
  constructor() {
    super('Judge signup is closed');
  }
}

export class NoActiveEditionError extends JudgeApplicationError {
  readonly code = 'no_active_edition';
  constructor() {
    super('There is no active edition');
  }
}

export interface Edition {
  id: string;
  slug: string;
  name: string;
  signupOpensAt: Date;
  signupClosesAt: Date;
}

export type SignupStatus = 'not_open' | 'open' | 'closed';

/** Signup window is [opensAt, closesAt): the deadline instant itself is already closed. */
export function signupStatus(edition: Edition, now: Date): SignupStatus {
  if (now < edition.signupOpensAt) return 'not_open';
  if (now >= edition.signupClosesAt) return 'closed';
  return 'open';
}

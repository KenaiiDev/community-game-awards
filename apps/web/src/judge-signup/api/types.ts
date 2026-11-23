export type SignupStatus = 'not_open' | 'open' | 'closed';

export interface Edition {
  slug: string;
  name: string;
  signupOpensAt: string;
  signupClosesAt: string;
  signupStatus: SignupStatus;
}

export interface PublicUser {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Application {
  editionSlug: string;
  consentedAt: string;
  consentVersion: string;
}

export interface AccountDeletion {
  /** When the account and all its data will be deleted (UTC ISO). */
  scheduledFor: string;
}

export interface Me {
  user: PublicUser;
  application: Application | null;
  /** Set while a requested deletion is in its one-week grace period. */
  deletion: AccountDeletion | null;
}

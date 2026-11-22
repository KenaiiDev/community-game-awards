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

export interface Me {
  user: PublicUser;
  application: Application | null;
}

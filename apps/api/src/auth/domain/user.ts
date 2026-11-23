export interface User {
  id: string;
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** Set while a requested deletion is in its grace period. */
  deletionRequestedAt: Date | null;
}

/** What Discord tells us about a user; signing in never touches the deletion flag. */
export type DiscordUserData = Omit<User, 'id' | 'deletionRequestedAt'>;

export interface DiscordProfile {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
}

export function userDataFromDiscord(profile: DiscordProfile): DiscordUserData {
  return {
    discordId: profile.id,
    username: profile.username,
    displayName: profile.globalName ?? profile.username,
    avatarUrl: profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : null,
  };
}

export interface User {
  id: string;
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface DiscordProfile {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
}

export function userDataFromDiscord(profile: DiscordProfile): Omit<User, 'id'> {
  return {
    discordId: profile.id,
    username: profile.username,
    displayName: profile.globalName ?? profile.username,
    avatarUrl: profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : null,
  };
}

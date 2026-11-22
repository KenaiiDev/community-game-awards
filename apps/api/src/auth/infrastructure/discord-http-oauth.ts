import { z } from 'zod';
import type { DiscordOAuth } from '../application/ports.js';
import type { DiscordProfile } from '../domain/user.js';

const API = 'https://discord.com/api/v10';

const tokenSchema = z.object({ access_token: z.string(), token_type: z.string() });
const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  global_name: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
});

export class DiscordHttpOAuth implements DiscordOAuth {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  authorizeUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: 'identify',
      redirect_uri: this.redirectUri,
      state,
      prompt: 'none',
    });
    return `https://discord.com/oauth2/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<DiscordProfile> {
    const tokenRes = await this.fetchFn(`${API}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
    });
    if (!tokenRes.ok) throw new Error(`Discord token exchange failed: ${tokenRes.status}`);
    const token = tokenSchema.parse(await tokenRes.json());

    const userRes = await this.fetchFn(`${API}/users/@me`, {
      headers: { Authorization: `${token.token_type} ${token.access_token}` },
    });
    if (!userRes.ok) throw new Error(`Discord profile request failed: ${userRes.status}`);
    const user = userSchema.parse(await userRes.json());

    return {
      id: user.id,
      username: user.username,
      globalName: user.global_name ?? null,
      avatar: user.avatar ?? null,
    };
  }
}

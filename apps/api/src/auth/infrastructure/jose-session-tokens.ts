import { SignJWT, jwtVerify } from 'jose';
import type { SessionTokens } from '../application/ports.js';

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export class JoseSessionTokens implements SessionTokens {
  private readonly key: Uint8Array;

  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret);
  }

  sign(userId: string): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
      .sign(this.key);
  }

  async verify(token: string): Promise<string | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: ['HS256'] });
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}

import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const PASSWORD_RESET_TTL_MINUTES = 60;
export const EMAIL_VERIFICATION_TTL_HOURS = 24;

/** Токен, который уходит пользователю в письме. В базе хранится только его хеш. */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Сравнение хешей за постоянное время, чтобы не давать подсказок по таймингу. */
export function tokenHashEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function expiresInMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function expiresInHours(hours: number): Date {
  return expiresInMinutes(hours * 60);
}

type ConsumableToken = { expiresAt: Date; usedAt: Date | null };

/** Токен годен, если он ещё не использован и не истёк. */
export function isTokenUsable(token: ConsumableToken, now: Date = new Date()): boolean {
  if (token.usedAt !== null) return false;
  return token.expiresAt.getTime() > now.getTime();
}

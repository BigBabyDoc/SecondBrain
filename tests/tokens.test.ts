import { describe, expect, it } from "vitest";
import {
  expiresInHours,
  expiresInMinutes,
  generateToken,
  hashToken,
  isTokenUsable,
  tokenHashEquals,
} from "@/lib/tokens";

describe("generateToken", () => {
  it("возвращает 64 hex-символа", () => {
    expect(generateToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("не повторяется", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("hashToken", () => {
  it("детерминирован", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("не хранит исходный токен", () => {
    const token = generateToken();
    expect(hashToken(token)).not.toBe(token);
  });

  it("различает разные токены", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("tokenHashEquals", () => {
  it("сравнивает одинаковые хеши", () => {
    const hash = hashToken("token");
    expect(tokenHashEquals(hash, hash)).toBe(true);
  });

  it("отвергает разные хеши", () => {
    expect(tokenHashEquals(hashToken("a"), hashToken("b"))).toBe(false);
  });

  it("не падает на строках разной длины", () => {
    expect(tokenHashEquals("aabb", hashToken("a"))).toBe(false);
  });
});

describe("isTokenUsable", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("принимает свежий неиспользованный токен", () => {
    const token = { expiresAt: new Date("2026-01-01T13:00:00Z"), usedAt: null };
    expect(isTokenUsable(token, now)).toBe(true);
  });

  it("отвергает истёкший токен", () => {
    const token = { expiresAt: new Date("2026-01-01T11:00:00Z"), usedAt: null };
    expect(isTokenUsable(token, now)).toBe(false);
  });

  it("отвергает уже использованный токен", () => {
    const token = {
      expiresAt: new Date("2026-01-01T13:00:00Z"),
      usedAt: new Date("2026-01-01T11:30:00Z"),
    };
    expect(isTokenUsable(token, now)).toBe(false);
  });
});

describe("сроки жизни", () => {
  it("expiresInMinutes отсчитывает от текущего момента", () => {
    const delta = expiresInMinutes(60).getTime() - Date.now();
    expect(delta).toBeGreaterThan(59 * 60 * 1000);
    expect(delta).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("expiresInHours длиннее expiresInMinutes с тем же числом", () => {
    expect(expiresInHours(2).getTime()).toBeGreaterThan(expiresInMinutes(2).getTime());
  });
});

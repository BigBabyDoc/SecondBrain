import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, WINDOW_MINUTES, windowStart } from "@/lib/rate-limit";

describe("параметры защиты от подбора", () => {
  it("окно и лимит заданы разумными значениями", () => {
    expect(MAX_ATTEMPTS).toBeGreaterThan(0);
    expect(MAX_ATTEMPTS).toBeLessThanOrEqual(10);
    expect(WINDOW_MINUTES).toBeGreaterThanOrEqual(5);
  });
});

describe("windowStart", () => {
  it("отступает ровно на длину окна назад", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(windowStart(now).toISOString()).toBe("2026-01-01T11:45:00.000Z");
  });

  it("всегда возвращает момент в прошлом", () => {
    expect(windowStart().getTime()).toBeLessThan(Date.now());
  });
});

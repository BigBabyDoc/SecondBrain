import { describe, expect, it } from "vitest";
import {
  BILLING_PERIODS,
  PLAN_DURATION_DAYS,
  PLAN_PRICES,
  TIER_ORDER,
  hasTierAccess,
} from "@/lib/access";

describe("hasTierAccess", () => {
  it("открывает бесплатные заметки всем", () => {
    expect(hasTierAccess("FREE", "FREE")).toBe(true);
    expect(hasTierAccess("PAID", "FREE")).toBe(true);
  });

  it("закрывает платные заметки от бесплатного тарифа", () => {
    expect(hasTierAccess("FREE", "PAID")).toBe(false);
  });

  it("открывает платные заметки подписчику", () => {
    expect(hasTierAccess("PAID", "PAID")).toBe(true);
  });

  it("сохраняет порядок тарифов: FREE ниже PAID", () => {
    expect(TIER_ORDER.indexOf("FREE")).toBeLessThan(TIER_ORDER.indexOf("PAID"));
  });
});

describe("тарифные планы", () => {
  it("годовая подписка выгоднее двенадцати месячных", () => {
    expect(PLAN_PRICES.YEARLY).toBeLessThan(PLAN_PRICES.MONTHLY * 12);
  });

  it("у каждого периода есть цена и длительность", () => {
    for (const period of BILLING_PERIODS) {
      expect(PLAN_PRICES[period]).toBeGreaterThan(0);
      expect(PLAN_DURATION_DAYS[period]).toBeGreaterThan(0);
    }
  });

  it("годовой период длиннее месячного", () => {
    expect(PLAN_DURATION_DAYS.YEARLY).toBeGreaterThan(PLAN_DURATION_DAYS.MONTHLY);
  });
});

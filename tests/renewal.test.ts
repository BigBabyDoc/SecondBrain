import { describe, expect, it } from "vitest";
import {
  MAX_RENEWAL_ATTEMPTS,
  RENEWAL_GRACE_DAYS,
  addDays,
  chargeAmount,
  nextPeriodEnd,
  priceIncreased,
  priceLowered,
  renewalIdempotenceKey,
} from "@/lib/renewal";

const NOW = new Date("2026-08-10T12:00:00.000Z");

describe("nextPeriodEnd", () => {
  it("продлевает от прежней даты окончания, если она ещё не наступила", () => {
    // Оплата за 5 дней до конца периода не должна сжигать эти 5 дней.
    const end = nextPeriodEnd({
      period: "MONTHLY",
      currentPeriodEnd: new Date("2026-08-15T12:00:00.000Z"),
      now: NOW,
    });

    expect(end).toEqual(new Date("2026-09-14T12:00:00.000Z"));
  });

  it("считает от текущего момента, если период уже закончился", () => {
    const end = nextPeriodEnd({
      period: "MONTHLY",
      currentPeriodEnd: new Date("2026-07-01T12:00:00.000Z"),
      now: NOW,
    });

    expect(end).toEqual(new Date("2026-09-09T12:00:00.000Z"));
  });

  it("считает от текущего момента при первой оплате", () => {
    const end = nextPeriodEnd({ period: "YEARLY", currentPeriodEnd: null, now: NOW });

    expect(end).toEqual(new Date("2027-08-10T12:00:00.000Z"));
  });

  it("годовой период длиннее месячного", () => {
    const monthly = nextPeriodEnd({ period: "MONTHLY", currentPeriodEnd: null, now: NOW });
    const yearly = nextPeriodEnd({ period: "YEARLY", currentPeriodEnd: null, now: NOW });

    expect(yearly.getTime()).toBeGreaterThan(monthly.getTime());
  });
});

describe("priceIncreased", () => {
  it("подорожание блокирует списание", () => {
    expect(priceIncreased(490, 590)).toBe(true);
  });

  it("прежняя цена списывается без подтверждения", () => {
    expect(priceIncreased(490, 490)).toBe(false);
  });

  it("подешевевший тариф списывается: меньше обещанного — можно", () => {
    expect(priceIncreased(490, 390)).toBe(false);
  });

  it("без согласованной суммы блокировать нечего", () => {
    expect(priceIncreased(null, 490)).toBe(false);
  });
});

describe("renewalIdempotenceKey", () => {
  const base = {
    subscriptionId: "sub_1",
    periodEnd: new Date("2026-09-01T00:00:00.000Z"),
    attempt: 1,
  };

  it("повтор той же попытки даёт тот же ключ — второго списания не будет", () => {
    expect(renewalIdempotenceKey(base)).toBe(renewalIdempotenceKey({ ...base }));
  });

  it("следующая попытка получает другой ключ", () => {
    expect(renewalIdempotenceKey({ ...base, attempt: 2 })).not.toBe(
      renewalIdempotenceKey(base)
    );
  });

  it("новый период получает другой ключ", () => {
    const nextPeriod = { ...base, periodEnd: new Date("2026-10-01T00:00:00.000Z") };
    expect(renewalIdempotenceKey(nextPeriod)).not.toBe(renewalIdempotenceKey(base));
  });

  it("разные подписки не пересекаются", () => {
    expect(renewalIdempotenceKey({ ...base, subscriptionId: "sub_2" })).not.toBe(
      renewalIdempotenceKey(base)
    );
  });
});

describe("окно повторов", () => {
  it("отсрочка доступа покрывает все попытки списания", () => {
    // Иначе доступ закроется раньше, чем закончатся попытки продлить подписку.
    expect(RENEWAL_GRACE_DAYS).toBeGreaterThanOrEqual(MAX_RENEWAL_ATTEMPTS);
  });

  it("оферта разрешает не больше трёх попыток", () => {
    expect(MAX_RENEWAL_ATTEMPTS).toBeLessThanOrEqual(3);
  });
});

describe("addDays", () => {
  it("не меняет исходную дату", () => {
    const original = new Date(NOW);
    addDays(original, 30);
    expect(original).toEqual(NOW);
  });

  it("отрицательный сдвиг отматывает назад", () => {
    expect(addDays(NOW, -1)).toEqual(new Date("2026-08-09T12:00:00.000Z"));
  });
});

describe("chargeAmount", () => {
  it("подешевевший тариф списывается по новой, меньшей цене", () => {
    // Пункт 8.3.3 оферты. Раньше здесь списывалась согласованная сумма,
    // и человек переплачивал за то, что подписался до снижения цены.
    expect(chargeAmount(490, 390)).toBe(390);
  });

  it("подорожавший тариф не может списаться по новой цене", () => {
    expect(chargeAmount(490, 590)).toBe(490);
  });

  it("при неизменной цене списывается она же", () => {
    expect(chargeAmount(490, 490)).toBe(490);
  });

  it("без согласованной суммы берётся текущая цена", () => {
    expect(chargeAmount(null, 490)).toBe(490);
  });

  it("никогда не превышает ни согласованную сумму, ни прайс", () => {
    for (const [agreed, current] of [[490, 390], [390, 490], [100, 100]] as const) {
      expect(chargeAmount(agreed, current)).toBeLessThanOrEqual(agreed);
      expect(chargeAmount(agreed, current)).toBeLessThanOrEqual(current);
    }
  });
});

describe("priceLowered", () => {
  it("срабатывает только на снижение", () => {
    expect(priceLowered(490, 390)).toBe(true);
    expect(priceLowered(490, 490)).toBe(false);
    expect(priceLowered(490, 590)).toBe(false);
    expect(priceLowered(null, 390)).toBe(false);
  });

  it("рост и снижение взаимно исключены", () => {
    for (const [agreed, current] of [[490, 390], [490, 590], [490, 490]] as const) {
      expect(priceLowered(agreed, current) && priceIncreased(agreed, current)).toBe(false);
    }
  });
});

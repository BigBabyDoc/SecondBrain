export const TIER_ORDER = ["FREE", "PAID"] as const;
export type TierName = (typeof TIER_ORDER)[number];

export const TIER_LABELS: Record<TierName, string> = {
  FREE: "Бесплатно",
  PAID: "Полный доступ",
};

export const TIER_DESCRIPTIONS: Record<TierName, string> = {
  FREE: "Часть заметок в открытом доступе — можно оценить качество и стиль подачи.",
  PAID: "Полный доступ ко всей библиотеке: клинические заметки, протоколы и разборы случаев.",
};

export function hasTierAccess(userTier: TierName, requiredTier: TierName): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}

export const BILLING_PERIODS = ["MONTHLY", "YEARLY"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const PLAN_LABELS: Record<BillingPeriod, string> = {
  MONTHLY: "1 месяц",
  YEARLY: "12 месяцев",
};

export const PLAN_PRICES: Record<BillingPeriod, number> = {
  MONTHLY: 490,
  YEARLY: 4900,
};

export const PLAN_DESCRIPTIONS: Record<BillingPeriod, string> = {
  MONTHLY: "Полный доступ к библиотеке заметок с помесячной оплатой.",
  YEARLY: "Тот же полный доступ на год — на 2 месяца дешевле, чем помесячно.",
};

export const PLAN_DURATION_DAYS: Record<BillingPeriod, number> = {
  MONTHLY: 30,
  YEARLY: 365,
};

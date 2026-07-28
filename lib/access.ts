export const TIER_ORDER = ["FREE", "BASIC", "PRO"] as const;
export type TierName = (typeof TIER_ORDER)[number];

export const TIER_LABELS: Record<TierName, string> = {
  FREE: "Бесплатно",
  BASIC: "Basic",
  PRO: "Pro",
};

export const TIER_PRICES: Record<TierName, number> = {
  FREE: 0,
  BASIC: 490,
  PRO: 1490,
};

export const TIER_DESCRIPTIONS: Record<TierName, string> = {
  FREE: "Часть заметок в открытом доступе — можно оценить качество и стиль подачи.",
  BASIC: "Полный доступ к базовым клиническим заметкам и разборам частых случаев.",
  PRO: "Всё из Basic плюс расширенные протоколы, редкие случаи и разборы сложных пациентов.",
};

export function hasTierAccess(userTier: TierName, requiredTier: TierName): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}

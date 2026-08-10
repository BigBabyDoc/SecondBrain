import { metrikaCounterId } from "@/lib/cookie-consent";

/**
 * Цели Яндекс.Метрики. Имена задаются здесь один раз: в интерфейсе Метрики
 * цель создаётся с тем же идентификатором, и опечатка в строке молча ломает
 * статистику — ошибки при отправке несуществующей цели не возникает.
 */
export const METRIKA_GOALS = {
  /** Аккаунт создан */
  registration: "registration",
  /** Нажата кнопка оплаты — до перехода на ЮKassa */
  paymentStarted: "payment_started",
  /** Подписка стала платной: деньги дошли и вебхук отработал */
  paymentSuccess: "payment_success",
} as const;

export type MetrikaGoal = (typeof METRIKA_GOALS)[keyof typeof METRIKA_GOALS];

type YandexMetrika = (counterId: number, action: string, target: string) => void;

/**
 * Отправляет цель, если счётчик загружен. Счётчик подключается только после
 * согласия на аналитические cookie, поэтому отсутствие `ym` — штатная ситуация,
 * а не сбой: пользователь отказался, и считать его действия нечем.
 */
export function reachGoal(goal: MetrikaGoal): void {
  if (typeof window === "undefined") return;

  const counterId = Number(metrikaCounterId());
  if (!counterId) return;

  const ym = (window as unknown as { ym?: YandexMetrika }).ym;
  if (typeof ym !== "function") return;

  ym(counterId, "reachGoal", goal);
}

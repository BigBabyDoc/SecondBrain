import { BillingPeriod, PLAN_DURATION_DAYS } from "@/lib/access";

/** Не больше трёх попыток списания — п. 8.2.4 оферты. */
export const MAX_RENEWAL_ATTEMPTS = 3;

/** За сколько дней предупреждаем о списании — п. 8.2.2 требует не позднее чем за 3. */
export const RENEWAL_NOTICE_DAYS = 3;

/**
 * Сколько дней доступ живёт после окончания оплаченного периода, пока идут
 * повторные попытки списания. Совпадает с окном повторов из п. 8.2.4: оферта
 * разрешает закрыть доступ сразу, но отбирать его у человека, у которого
 * просто не прошла карта, раньше последней попытки — нечестно.
 */
export const RENEWAL_GRACE_DAYS = MAX_RENEWAL_ATTEMPTS;

export const DAY_MS = 86_400_000;

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Новая дата окончания подписки после успешной оплаты.
 *
 * Отсчёт идёт от прежней даты окончания, если она ещё не наступила, и только
 * иначе — от текущего момента. Иначе пользователь, оплативший следующий период
 * заранее, терял бы остаток уже оплаченного.
 */
export function nextPeriodEnd(params: {
  period: BillingPeriod;
  currentPeriodEnd: Date | null;
  now: Date;
}): Date {
  const base =
    params.currentPeriodEnd && params.currentPeriodEnd > params.now
      ? params.currentPeriodEnd
      : params.now;

  return addDays(base, PLAN_DURATION_DAYS[params.period]);
}

/**
 * Ключ идемпотентности для автосписания. Детерминированный по подписке, дате
 * окончания периода и номеру попытки: повторный запуск задачи после сбоя
 * получит от ЮKassa тот же платёж, а не спишет деньги ещё раз.
 */
export function renewalIdempotenceKey(params: {
  subscriptionId: string;
  periodEnd: Date;
  attempt: number;
}): string {
  return `renew-${params.subscriptionId}-${params.periodEnd.toISOString()}-${params.attempt}`;
}

/**
 * Подорожал ли тариф с момента, когда пользователь согласился на списания.
 * По п. 8.3.2 списывать новую сумму без подтверждения нельзя.
 *
 * Снижение цены не блокирует продление: списать меньше обещанного можно.
 */
export function priceIncreased(agreed: number | null, current: number): boolean {
  return agreed !== null && current > agreed;
}

/** Подешевел ли тариф — п. 8.3.3 требует уведомить и списать меньшую сумму. */
export function priceLowered(agreed: number | null, current: number): boolean {
  return agreed !== null && current < agreed;
}

/**
 * Сколько списывать. Никогда не больше согласованного — на это нет согласия
 * (п. 8.3.2); и никогда не больше текущей цены — брать с человека сверх
 * прайса только потому, что он подписался раньше подешевения, нельзя (п. 8.3.3).
 */
export function chargeAmount(agreed: number | null, current: number): number {
  return agreed === null ? current : Math.min(agreed, current);
}

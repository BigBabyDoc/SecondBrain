/** Значения выбора посетителя. Хранится в обычном cookie, доступном браузеру. */
export type CookieChoice = "all" | "necessary";

export const COOKIE_CONSENT_NAME = "cookie_consent";

/** Согласие действует 6 месяцев — срок указан в Политике использования файлов cookie. */
export const COOKIE_CONSENT_DAYS = 180;

/** Номер счётчика Яндекс.Метрики. Пока не задан, аналитика не подключается вовсе. */
export function metrikaCounterId(): string | null {
  const id = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID?.trim();
  return id ? id : null;
}

export function isValidChoice(value: string | undefined): value is CookieChoice {
  return value === "all" || value === "necessary";
}

/**
 * Читает выбор посетителя на сервере. Так баннер не мигает у тех, кто уже
 * ответил: разметка сразу приходит в нужном виде, без эффекта после гидратации.
 */
export async function readCookieChoice(): Promise<CookieChoice | null> {
  const { cookies } = await import("next/headers");
  const value = (await cookies()).get(COOKIE_CONSENT_NAME)?.value;
  return isValidChoice(value) ? value : null;
}

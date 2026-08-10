import { createHmac, timingSafeEqual } from "crypto";

/**
 * Ссылка «Отписаться» для рекламных писем — её обещает п. 6 Согласия № 4.
 *
 * Токен не хранится в базе: это HMAC от идентификатора пользователя на секрете
 * приложения. Отдельная таблица здесь была бы лишней сущностью — ссылка живёт
 * в письме сколько угодно долго, отзывать её нечем и незачем, а подделать
 * нельзя. Заодно письмо, отправленное год назад, продолжает работать.
 *
 * Секрет тот же, что у сессий: если он сменится, старые ссылки перестанут
 * действовать — тогда отписка остаётся через кабинет и письмо на почту,
 * оба способа названы в том же пункте согласия.
 */
function secret(): string {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET не задан — нечем подписать ссылку отписки");
  }
  return value;
}

function sign(userId: string): string {
  return createHmac("sha256", secret()).update(userId).digest("hex");
}

export function unsubscribeToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

/** Возвращает идентификатор пользователя или null, если подпись не сходится. */
export function verifyUnsubscribeToken(token: string | null): string | null {
  if (!token) return null;

  // Идентификатор может содержать точки не больше одной, но подпись — всегда
  // последний сегмент, поэтому режем справа.
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const userId = token.slice(0, separator);
  const provided = Buffer.from(token.slice(separator + 1), "utf8");
  const expected = Buffer.from(sign(userId), "utf8");

  // Сравнение постоянного времени: побайтовое сравнение выдаёт подпись
  // по времени ответа, как и в проверке токенов почты.
  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? userId : null;
}

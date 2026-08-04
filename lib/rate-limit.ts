import { prisma } from "@/lib/prisma";

export const MAX_ATTEMPTS = 5;
export const WINDOW_MINUTES = 15;

export function windowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);
}

/**
 * Попытки считаются в БД, а не в памяти процесса: на serverless-хостинге
 * (Vercel и подобных) у каждого инстанса своя память, и счётчик в ней
 * не защищает от подбора.
 */
export async function isRateLimited(identifier: string): Promise<boolean> {
  const attempts = await prisma.loginAttempt.count({
    where: {
      identifier: identifier.toLowerCase(),
      createdAt: { gte: windowStart() },
    },
  });
  return attempts >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(identifier: string): Promise<void> {
  await prisma.loginAttempt.create({
    data: { identifier: identifier.toLowerCase() },
  });
}

/** После успешного входа счётчик по этому идентификатору обнуляется. */
export async function clearAttempts(identifier: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({
    where: { identifier: identifier.toLowerCase() },
  });
}

/** Сколько минут осталось до снятия блокировки — для сообщения пользователю. */
export async function minutesUntilUnlock(identifier: string): Promise<number> {
  const oldest = await prisma.loginAttempt.findFirst({
    where: {
      identifier: identifier.toLowerCase(),
      createdAt: { gte: windowStart() },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!oldest) return 0;

  const unlockAt = oldest.createdAt.getTime() + WINDOW_MINUTES * 60 * 1000;
  return Math.max(1, Math.ceil((unlockAt - Date.now()) / 60000));
}

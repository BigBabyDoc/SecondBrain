import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendExpiryReminderEmail } from "@/lib/emails";

/** За сколько дней до окончания напоминаем о продлении. */
const REMINDER_DAYS = 3;

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Ежедневная служебная задача: помечает истёкшие подписки и рассылает
 * напоминания о скором окончании. Вызывается планировщиком хостинга
 * (Vercel Cron, systemd timer, внешний сервис) с заголовком
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET не задан" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 1. Подписки, оплаченный период которых закончился, переводим на бесплатный тариф.
  const expired = await prisma.subscription.updateMany({
    where: {
      tier: "PAID",
      currentPeriodEnd: { lt: now },
    },
    data: {
      tier: "FREE",
      period: null,
      status: "EXPIRED",
      yookassaMethodId: null,
    },
  });

  // 2. Напоминания тем, у кого период заканчивается ровно через REMINDER_DAYS дней.
  const target = new Date(now);
  target.setDate(target.getDate() + REMINDER_DAYS);

  const expiring = await prisma.subscription.findMany({
    where: {
      tier: "PAID",
      currentPeriodEnd: { gte: startOfDay(target), lte: endOfDay(target) },
    },
    include: { user: true },
  });

  for (const subscription of expiring) {
    if (!subscription.currentPeriodEnd) continue;
    await sendExpiryReminderEmail({
      to: subscription.user.email,
      name: subscription.user.name,
      periodEnd: subscription.currentPeriodEnd,
      daysLeft: REMINDER_DAYS,
    });
  }

  return NextResponse.json({
    ok: true,
    expired: expired.count,
    remindersSent: expiring.length,
  });
}

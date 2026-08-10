import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { BillingPeriod, PLAN_PRICES } from "@/lib/access";
import { chargeSavedMethod } from "@/lib/yookassa";
import {
  MAX_RENEWAL_ATTEMPTS,
  RENEWAL_GRACE_DAYS,
  RENEWAL_NOTICE_DAYS,
  addDays,
  nextPeriodEnd,
  priceIncreased,
  renewalIdempotenceKey,
} from "@/lib/renewal";
import {
  sendExpiryReminderEmail,
  sendPaymentSuccessEmail,
  sendRenewalFailedEmail,
  sendRenewalNoticeEmail,
  sendRenewalPriceChangedEmail,
} from "@/lib/emails";

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
 * Ежедневная служебная задача. Порядок шагов важен: сначала предупреждаем о
 * списании, затем списываем, и только потом закрываем доступ — иначе подписка
 * успеет истечь до того, как её продлят.
 *
 * Вызывается планировщиком хостинга (systemd timer, Vercel Cron, внешний
 * сервис) с заголовком `Authorization: Bearer $CRON_SECRET`.
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

  const notices = await sendRenewalNotices(now);
  const renewals = await chargeDueSubscriptions(now);
  const reminders = await remindExpiring(now);
  const expired = await expireOverdue(now);

  return NextResponse.json({ ok: true, ...notices, ...renewals, ...reminders, expired });
}

/**
 * Шаг 1. Предупреждение о предстоящем списании (п. 8.2.2 оферты — не позднее
 * чем за 3 календарных дня). `renewalNoticeSentAt` защищает от повтора: задача
 * запускается ежедневно, а предупреждение должно уйти один раз за период.
 */
async function sendRenewalNotices(now: Date) {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      tier: "PAID",
      autoRenew: true,
      yookassaMethodId: { not: null },
      currentPeriodEnd: { gt: now, lte: addDays(now, RENEWAL_NOTICE_DAYS) },
      renewalNoticeSentAt: null,
    },
    include: { user: true },
  });

  for (const subscription of subscriptions) {
    if (!subscription.currentPeriodEnd || !subscription.period) continue;

    await sendRenewalNoticeEmail({
      to: subscription.user.email,
      name: subscription.user.name,
      period: subscription.period as BillingPeriod,
      chargeDate: subscription.currentPeriodEnd,
      // Сумма из письма — та, о которой человек договаривался, а не текущий
      // прайс: списать больше без подтверждения мы всё равно не имеем права.
      amount: Number(subscription.renewalAmount ?? PLAN_PRICES[subscription.period]),
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { renewalNoticeSentAt: now },
    });
  }

  return { renewalNoticesSent: subscriptions.length };
}

/**
 * Шаг 2. Автосписание за следующий период. Берём подписки, чей оплаченный
 * период уже закончился, но окно повторов ещё не исчерпано (п. 8.2.4).
 */
async function chargeDueSubscriptions(now: Date) {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      tier: "PAID",
      autoRenew: true,
      yookassaMethodId: { not: null },
      currentPeriodEnd: { lte: now, gt: addDays(now, -RENEWAL_GRACE_DAYS) },
      renewalAttempts: { lt: MAX_RENEWAL_ATTEMPTS },
    },
    include: { user: true },
  });

  let charged = 0;
  let failed = 0;
  let priceHeld = 0;

  for (const subscription of subscriptions) {
    const { currentPeriodEnd, period, yookassaMethodId } = subscription;
    if (!currentPeriodEnd || !period || !yookassaMethodId) continue;

    const agreed = subscription.renewalAmount === null
      ? null
      : Number(subscription.renewalAmount);
    const current = PLAN_PRICES[period as BillingPeriod];

    // Пункт 8.3.2: подорожание приостанавливает автопродление до отдельного
    // подтверждения новой суммы. Молча списать больше — прямое нарушение.
    if (priceIncreased(agreed, current)) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { autoRenew: false, status: "CANCELED" },
      });
      await sendRenewalPriceChangedEmail({
        to: subscription.user.email,
        name: subscription.user.name,
        period: period as BillingPeriod,
        periodEnd: currentPeriodEnd,
        oldAmount: agreed ?? current,
        newAmount: current,
      });
      priceHeld += 1;
      continue;
    }

    const attempt = subscription.renewalAttempts + 1;
    const amount = agreed ?? current;

    try {
      const payment = await chargeSavedMethod({
        userId: subscription.userId,
        userEmail: subscription.user.email,
        period: period as BillingPeriod,
        methodId: yookassaMethodId,
        amount,
        idempotenceKey: renewalIdempotenceKey({
          subscriptionId: subscription.id,
          periodEnd: currentPeriodEnd,
          attempt,
        }),
      });

      // Строку платежа пишем при любом исходе: даже отменённая попытка должна
      // быть видна в истории — иначе списание «из ниоткуда» невозможно сверить.
      await prisma.payment.upsert({
        where: { yookassaPaymentId: payment.id },
        create: {
          userId: subscription.userId,
          tier: "PAID",
          period: period as BillingPeriod,
          amount: payment.amount.value,
          currency: payment.amount.currency,
          status: payment.status === "succeeded" ? "SUCCEEDED" : "PENDING",
          kind: "RENEWAL",
          yookassaPaymentId: payment.id,
        },
        update: {},
      });

      if (payment.status === "succeeded" && payment.paid) {
        const periodEnd = nextPeriodEnd({
          period: period as BillingPeriod,
          currentPeriodEnd,
          now,
        });

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodEnd: periodEnd,
            status: "ACTIVE",
            renewalAttempts: 0,
            renewalNoticeSentAt: null,
          },
        });

        await sendPaymentSuccessEmail({
          to: subscription.user.email,
          name: subscription.user.name,
          period: period as BillingPeriod,
          periodEnd,
          autoRenew: true,
          renewalAmount: amount,
          isRenewal: true,
        });

        charged += 1;
        continue;
      }

      // `pending` — ещё не отказ: платёж дозреет, и подписку продлит вебхук.
      // Счётчик попыток не трогаем, чтобы не сжечь окно повторов на ожидании.
      if (payment.status === "pending") continue;

      await recordFailure(subscription.id, attempt);
      failed += 1;
    } catch (error) {
      // Сетевая ошибка или отказ API — такая же неудачная попытка. Ключ
      // идемпотентности привязан к номеру попытки, так что повтор завтра
      // не приведёт к двойному списанию за сегодняшнюю.
      Sentry.captureException(error);
      await recordFailure(subscription.id, attempt);
      failed += 1;
    }

    if (attempt >= MAX_RENEWAL_ATTEMPTS) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { autoRenew: false, status: "CANCELED" },
      });
      await sendRenewalFailedEmail({
        to: subscription.user.email,
        name: subscription.user.name,
        period: period as BillingPeriod,
        periodEnd: currentPeriodEnd,
      });
    }
  }

  return { renewalsCharged: charged, renewalsFailed: failed, renewalsPriceHeld: priceHeld };
}

async function recordFailure(subscriptionId: string, attempt: number) {
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { renewalAttempts: attempt },
  });
}

/**
 * Шаг 3. Напоминание тем, у кого автопродления нет: без него подписка просто
 * закончится, и об этом надо предупредить заранее.
 */
async function remindExpiring(now: Date) {
  const target = addDays(now, RENEWAL_NOTICE_DAYS);

  const expiring = await prisma.subscription.findMany({
    where: {
      tier: "PAID",
      autoRenew: false,
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
      daysLeft: RENEWAL_NOTICE_DAYS,
    });
  }

  return { remindersSent: expiring.length };
}

/**
 * Шаг 4. Понижение тарифа. Подписки, по которым ещё идут попытки списания,
 * доживают до конца окна повторов — их условие отсеивает.
 */
async function expireOverdue(now: Date): Promise<number> {
  const result = await prisma.subscription.updateMany({
    where: {
      tier: "PAID",
      currentPeriodEnd: { lt: now },
      NOT: {
        autoRenew: true,
        renewalAttempts: { lt: MAX_RENEWAL_ATTEMPTS },
        currentPeriodEnd: { gt: addDays(now, -RENEWAL_GRACE_DAYS) },
      },
    },
    data: {
      tier: "FREE",
      period: null,
      status: "EXPIRED",
      autoRenew: false,
      // Платёжное средство больше не нужно и не должно храниться дольше цели,
      // ради которой было сохранено.
      yookassaMethodId: null,
      renewalAmount: null,
      renewalAttempts: 0,
      renewalNoticeSentAt: null,
    },
  });

  return result.count;
}

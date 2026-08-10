import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchYookassaPayment } from "@/lib/yookassa";
import { BillingPeriod, PLAN_PRICES } from "@/lib/access";
import { sendPaymentSuccessEmail } from "@/lib/emails";
import { nextPeriodEnd } from "@/lib/renewal";
import { revokeConsent } from "@/lib/consents";

// ЮKassa не подписывает вебхуки, поэтому мы никогда не доверяем телу запроса напрямую:
// после уведомления перезапрашиваем статус платежа по API своим секретным ключом.
export async function POST(request: Request) {
  let body: { object?: { id?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const paymentId = body.object?.id;
  if (!paymentId) {
    return NextResponse.json({ error: "missing payment id" }, { status: 400 });
  }

  const payment = await fetchYookassaPayment(paymentId);

  const existing = await prisma.payment.findUnique({
    where: { yookassaPaymentId: paymentId },
  });

  if (!existing) {
    return NextResponse.json({ error: "unknown payment" }, { status: 404 });
  }

  if (payment.status === "succeeded" && payment.paid) {
    if (existing.status !== "SUCCEEDED") {
      const period = (payment.metadata?.period as BillingPeriod) ?? existing.period;
      const subscription = await prisma.subscription.findUnique({
        where: { userId: existing.userId },
      });

      const periodEnd = nextPeriodEnd({
        period,
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        now: new Date(),
      });

      // Автопродление включается только при явном согласии: сохранённое
      // платёжное средство само по себе согласием не является (п. 8.1.2).
      const autoRenew =
        payment.metadata?.autoRenew === "1" && Boolean(payment.payment_method?.id);

      const renewalState = autoRenew
        ? {
            autoRenew: true,
            yookassaMethodId: payment.payment_method?.id,
            renewalAmount: PLAN_PRICES[period],
            renewalAttempts: 0,
            renewalNoticeSentAt: null,
          }
        : {
            autoRenew: false,
            // Оплата без отметки — это отказ от списаний на новый период.
            // Держать при этом привязанное средство нельзя: цель, ради которой
            // оно сохранялось, отпала, а согласия на его использование больше нет.
            yookassaMethodId: null,
            renewalAmount: null,
            renewalAttempts: 0,
            renewalNoticeSentAt: null,
          };

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: existing.id },
          data: { status: "SUCCEEDED" },
        }),
        prisma.subscription.upsert({
          where: { userId: existing.userId },
          create: {
            userId: existing.userId,
            tier: "PAID",
            period,
            status: autoRenew ? "ACTIVE" : "CANCELED",
            currentPeriodEnd: periodEnd,
            ...renewalState,
          },
          update: {
            tier: "PAID",
            period,
            status: autoRenew ? "ACTIVE" : "CANCELED",
            currentPeriodEnd: periodEnd,
            ...renewalState,
          },
        }),
      ]);

      // Согласие № 2 в журнале не должно переживать отказ от списаний. IP здесь
      // не пишем: запрос пришёл от ЮKassa, и её адрес выдавать за адрес
      // пользователя было бы враньём в юридически значимой записи.
      if (!autoRenew) {
        await revokeConsent({ userId: existing.userId, type: "AUTO_RENEWAL", ip: null });
      }

      const user = await prisma.user.findUnique({ where: { id: existing.userId } });
      if (user) {
        await sendPaymentSuccessEmail({
          to: user.email,
          name: user.name,
          period,
          periodEnd,
          // Письмо об успешной оплате заодно закрывает п. 8.1.3: при подключении
          // автопродления пользователя нужно уведомить о сумме, периодичности,
          // дате первого списания и порядке отмены.
          autoRenew,
          renewalAmount: PLAN_PRICES[period],
          isRenewal: existing.kind === "RENEWAL",
        });
      }
    }
  } else if (payment.status === "canceled" && existing.status === "PENDING") {
    await prisma.payment.update({
      where: { id: existing.id },
      data: { status: "CANCELED" },
    });
  }

  return NextResponse.json({ ok: true });
}

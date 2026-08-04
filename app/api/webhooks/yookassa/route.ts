import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchYookassaPayment } from "@/lib/yookassa";
import { BillingPeriod, PLAN_DURATION_DAYS } from "@/lib/access";
import { sendPaymentSuccessEmail } from "@/lib/emails";

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
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + PLAN_DURATION_DAYS[period]);

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
            status: "ACTIVE",
            currentPeriodEnd: periodEnd,
            yookassaMethodId: payment.payment_method?.id,
          },
          update: {
            tier: "PAID",
            period,
            status: "ACTIVE",
            currentPeriodEnd: periodEnd,
            yookassaMethodId: payment.payment_method?.id,
          },
        }),
      ]);

      const user = await prisma.user.findUnique({ where: { id: existing.userId } });
      if (user) {
        await sendPaymentSuccessEmail({
          to: user.email,
          name: user.name,
          period,
          periodEnd,
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

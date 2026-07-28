import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchYookassaPayment } from "@/lib/yookassa";
import { TierName } from "@/lib/access";

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
      const tier = (payment.metadata?.tier as TierName) ?? existing.tier;
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: existing.id },
          data: { status: "SUCCEEDED" },
        }),
        prisma.subscription.upsert({
          where: { userId: existing.userId },
          create: {
            userId: existing.userId,
            tier,
            status: "ACTIVE",
            currentPeriodEnd: periodEnd,
            yookassaMethodId: payment.payment_method?.id,
          },
          update: {
            tier,
            status: "ACTIVE",
            currentPeriodEnd: periodEnd,
            yookassaMethodId: payment.payment_method?.id,
          },
        }),
      ]);
    }
  } else if (payment.status === "canceled" && existing.status === "PENDING") {
    await prisma.payment.update({
      where: { id: existing.id },
      data: { status: "CANCELED" },
    });
  }

  return NextResponse.json({ ok: true });
}

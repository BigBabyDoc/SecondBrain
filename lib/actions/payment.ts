"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createYookassaPayment } from "@/lib/yookassa";
import { BillingPeriod } from "@/lib/access";

export async function createPaymentAction(period: BillingPeriod) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!session.user.email) {
    throw new Error("У аккаунта не указан email — нужен для формирования чека");
  }

  // Чек по платежу уходит на email, поэтому адрес должен быть подтверждён:
  // иначе фискальный документ уйдёт на адрес, доступ к которому не проверен.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    redirect("/account?payment=unverified");
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const payment = await createYookassaPayment({
    userId: session.user.id,
    userEmail: session.user.email,
    period,
    returnUrl: `${baseUrl}/account?payment=pending`,
  });

  await prisma.payment.create({
    data: {
      userId: session.user.id,
      tier: "PAID",
      period,
      amount: payment.amount.value,
      currency: payment.amount.currency,
      status: "PENDING",
      yookassaPaymentId: payment.id,
    },
  });

  if (!payment.confirmation?.confirmation_url) {
    throw new Error("ЮKassa не вернула ссылку на оплату");
  }

  redirect(payment.confirmation.confirmation_url);
}

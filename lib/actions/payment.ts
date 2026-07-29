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

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const payment = await createYookassaPayment({
    userId: session.user.id,
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

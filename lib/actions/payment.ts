"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createYookassaPayment } from "@/lib/yookassa";
import { BillingPeriod } from "@/lib/access";
import { AUTO_RENEWAL_ENABLED } from "@/lib/legal";
import { grantConsent, requestIp } from "@/lib/consents";

export async function createPaymentAction(period: BillingPeriod, formData: FormData) {
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

  // Отметка снята по умолчанию: п. 8.1.2 оферты требует, чтобы оплата без
  // привязки платёжного средства оставалась доступной, а согласие на списания
  // было отдельным действием пользователя.
  const autoRenew = AUTO_RENEWAL_ENABLED && formData.get("autoRenew") === "on";

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const payment = await createYookassaPayment({
    userId: session.user.id,
    userEmail: session.user.email,
    period,
    returnUrl: `${baseUrl}/account?payment=pending`,
    saveMethod: autoRenew,
  });

  await prisma.payment.create({
    data: {
      userId: session.user.id,
      tier: "PAID",
      period,
      amount: payment.amount.value,
      currency: payment.amount.currency,
      status: "PENDING",
      kind: "INITIAL",
      yookassaPaymentId: payment.id,
    },
  });

  // Согласие № 2 фиксируется в момент, когда пользователь его дал, а не когда
  // деньги дошли: п. 8.1.4 требует зафиксировать дату, время и параметры
  // подписки на момент предоставления согласия. Если оплата сорвётся,
  // автопродление всё равно не включится — оно включается вебхуком.
  if (autoRenew) {
    await grantConsent({
      userId: session.user.id,
      type: "AUTO_RENEWAL",
      ip: await requestIp(),
    });
  }

  if (!payment.confirmation?.confirmation_url) {
    throw new Error("ЮKassa не вернула ссылку на оплату");
  }

  redirect(payment.confirmation.confirmation_url);
}

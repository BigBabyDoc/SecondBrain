"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revokeConsent, requestIp } from "@/lib/consents";
import { sendAutoRenewalCanceledEmail } from "@/lib/emails";
import { BillingPeriod } from "@/lib/access";

/**
 * Отмена автопродления — одно действие, как требует п. 8.4.2 оферты («порядок
 * отмены не может быть сложнее порядка подключения»). Поэтому здесь сразу все
 * три права из п. 8.4.1: выключить продление, отвязать платёжное средство и
 * отказаться от его использования впредь.
 *
 * Идентификатор средства удаляется навсегда: по п. 8.4.4 списания по нему не
 * производятся ни при каких обстоятельствах, а для возобновления требуется
 * новое согласие — оно даётся при следующей оплате. Отдельной кнопки
 * «возобновить» нет намеренно: без привязанного средства она обещала бы
 * списание, которое технически невозможно.
 *
 * Доступ к оплаченному периоду сохраняется (п. 8.4.5) — тариф не понижаем.
 */
export async function cancelSubscriptionAction(): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });
  if (!subscription || subscription.tier !== "PAID") return;
  if (!subscription.autoRenew) return;

  await prisma.subscription.update({
    where: { userId: session.user.id },
    data: {
      autoRenew: false,
      status: "CANCELED",
      yookassaMethodId: null,
      renewalAmount: null,
      renewalAttempts: 0,
      renewalNoticeSentAt: null,
    },
  });

  await revokeConsent({
    userId: session.user.id,
    type: "AUTO_RENEWAL",
    ip: await requestIp(),
  });

  // Пункт 8.4.6: отмену подтверждаем письмом.
  if (subscription.period && subscription.currentPeriodEnd) {
    await sendAutoRenewalCanceledEmail({
      to: subscription.user.email,
      name: subscription.user.name,
      period: subscription.period as BillingPeriod,
      periodEnd: subscription.currentPeriodEnd,
    });
  }

  revalidatePath("/account");
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Отмена автопродления. Доступ к материалам сохраняется до конца оплаченного
 * периода — деньги за него уже получены, поэтому тариф не понижаем сразу.
 * Сохранённый способ оплаты удаляем, чтобы списаний больше не было.
 */
export async function cancelSubscriptionAction(): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });
  if (!subscription || subscription.tier !== "PAID") return;

  await prisma.subscription.update({
    where: { userId: session.user.id },
    data: { status: "CANCELED", yookassaMethodId: null },
  });

  revalidatePath("/account");
}

/** Возврат к автопродлению до окончания оплаченного периода. */
export async function resumeSubscriptionAction(): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });
  if (!subscription || subscription.status !== "CANCELED") return;

  const stillPaid =
    subscription.currentPeriodEnd !== null &&
    subscription.currentPeriodEnd.getTime() > Date.now();
  if (!stillPaid) return;

  await prisma.subscription.update({
    where: { userId: session.user.id },
    data: { status: "ACTIVE" },
  });

  revalidatePath("/account");
}

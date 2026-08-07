"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { grantConsent, requestIp, revokeConsent } from "@/lib/consents";

/** Включение и отключение рассылок. Отзыв фиксируется в журнале согласий. */
export async function setMarketingConsentAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  const enable = formData.get("enable") === "on";
  const ip = await requestIp();

  if (enable) {
    await grantConsent({ userId: session.user.id, type: "MARKETING", ip });
  } else {
    await revokeConsent({ userId: session.user.id, type: "MARKETING", ip });
  }

  revalidatePath("/account");
}

/**
 * Самостоятельное удаление учётной записи.
 *
 * Записи о платежах остаются: их хранение обязательно для налогового учёта
 * (4 года по пп. 8 п. 1 ст. 23 НК РФ), поэтому они обезличиваются — связь с
 * пользователем разрывается, а сумма и дата сохраняются. Всё остальное,
 * включая согласия и токены, удаляется каскадом вместе с пользователем.
 */
export async function deleteAccountAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  // Подтверждение словом защищает от случайного нажатия.
  if (formData.get("confirm") !== "УДАЛИТЬ") return;

  const userId = session.user.id;

  const payments = await prisma.payment.findMany({
    where: { userId },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    if (payments.length > 0) {
      // Сохраняем факт расчёта, но переносим его на обезличенную запись.
      const archive = await tx.user.create({
        data: {
          // Адрес уникален, поэтому берём заведомо несуществующий домен.
          email: `deleted-${userId}@invalid`,
          name: "Удалённый пользователь",
          passwordHash: "",
        },
      });
      await tx.payment.updateMany({
        where: { userId },
        data: { userId: archive.id },
      });
    }
    await tx.user.delete({ where: { id: userId } });
  });

  await signOut({ redirectTo: "/?account=deleted" });
}

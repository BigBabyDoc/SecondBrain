"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/emails";
import {
  PASSWORD_RESET_TTL_MINUTES,
  expiresInMinutes,
  generateToken,
  hashToken,
  isTokenUsable,
} from "@/lib/tokens";
import { clearAttempts } from "@/lib/rate-limit";

export type ForgotPasswordState = { error?: string; sent?: boolean };
export type ResetPasswordState = { error?: string; done?: boolean };

const emailSchema = z.string().email("Некорректный email");
const passwordSchema = z.string().min(8, "Пароль должен быть не короче 8 символов");

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректный email" };
  }

  const email = parsed.data.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Отвечаем одинаково независимо от того, есть такой пользователь или нет,
  // чтобы форма не превращалась в способ проверять чужие адреса на регистрацию.
  if (user) {
    const token = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: expiresInMinutes(PASSWORD_RESET_TTL_MINUTES),
      },
    });
    await sendPasswordResetEmail({ to: user.email, name: user.name, token });
  }

  return { sent: true };
}

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = formData.get("token");
  if (typeof token !== "string" || token.length === 0) {
    return { error: "Ссылка недействительна" };
  }

  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте пароль" };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!record || !isTokenUsable(record)) {
    return { error: "Ссылка устарела или уже была использована. Запросите новую." };
  }

  const passwordHash = await bcrypt.hash(parsed.data, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Остальные выданные ссылки на сброс становятся недействительными.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  // Смена пароля снимает блокировку по неудачным попыткам входа.
  await clearAttempts(record.user.email);

  return { done: true };
}

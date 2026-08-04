"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/emails";
import {
  EMAIL_VERIFICATION_TTL_HOURS,
  expiresInHours,
  generateToken,
  hashToken,
} from "@/lib/tokens";

/** Создаёт токен подтверждения и отправляет письмо. Используется при регистрации и повторной отправке. */
export async function issueEmailVerification(user: {
  id: string;
  email: string;
  name: string;
}): Promise<void> {
  const token = generateToken();

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: expiresInHours(EMAIL_VERIFICATION_TTL_HOURS),
    },
  });

  await sendVerificationEmail({ to: user.email, name: user.name, token });
}

export async function resendVerificationAction(): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.emailVerified) return;

  await issueEmailVerification(user);
  revalidatePath("/account");
}

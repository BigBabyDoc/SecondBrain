import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken, isTokenUsable } from "@/lib/tokens";
import { baseUrl } from "@/lib/mail";

/**
 * Ссылка из письма. Обработчик, а не страница: подтверждение меняет данные,
 * а рендер страницы может выполниться повторно (префетч, ретрай) и сжечь токен.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const redirectTo = (status: string) =>
    NextResponse.redirect(new URL(`/account?verified=${status}`, baseUrl()));

  if (!token) return redirectTo("invalid");

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!record) return redirectTo("invalid");

  // Повторный переход по уже сработавшей ссылке — не ошибка, если email подтверждён.
  if (record.user.emailVerified) return redirectTo("1");

  if (!isTokenUsable(record)) return redirectTo("expired");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return redirectTo("1");
}

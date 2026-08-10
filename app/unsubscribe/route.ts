import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revokeConsent } from "@/lib/consents";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { baseUrl } from "@/lib/mail";

/**
 * Отписка от рекламных писем по ссылке из письма — п. 6 Согласия № 4.
 *
 * Обработчик маршрута, а не страница: рендер страницы повторяется при
 * префетче и повторных запросах, а отписка меняет состояние. Здесь же
 * это ровно одно действие на один переход — как и в подтверждении почты.
 *
 * Вход не требуется: человек, который отписывается, может быть не авторизован,
 * а требовать логина ради отказа от рассылки — ровно тот барьер, который
 * запрещает ч. 1 ст. 18 ФЗ «О рекламе». Подпись в токене подтверждает, что
 * ссылку выдали мы. По той же причине итог показывает публичная страница
 * /unsubscribed, а не кабинет: кабинет за логином.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const userId = verifyUnsubscribeToken(token);

  if (!userId) {
    return NextResponse.redirect(`${baseUrl()}/unsubscribed?status=invalid`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    // Учётной записи уже нет — писем и так не будет, человеку это и нужно.
    return NextResponse.redirect(`${baseUrl()}/unsubscribed`);
  }

  // IP не пишем: отзыв делает сам пользователь переходом по ссылке, но
  // подтвердить, что это он, а не почтовый сканер, мы не можем.
  await revokeConsent({ userId, type: "MARKETING", ip: null });

  return NextResponse.redirect(`${baseUrl()}/unsubscribed`);
}

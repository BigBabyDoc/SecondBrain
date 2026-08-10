import Link from "next/link";

export const metadata = {
  title: "Отписка от рассылки — Второй мозг педиатра",
  robots: { index: false },
};

/**
 * Итог отписки. Страница публичная и намеренно не требует входа: по ссылке
 * из письма человек приходит чаще всего без активной сессии, а логин ради
 * отказа от рекламы — тот самый барьер, который запрещает ч. 1 ст. 18
 * ФЗ «О рекламе».
 */
export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const failed = status === "invalid";

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-2xl font-bold">
        {failed ? "Ссылка не сработала" : "Вы отписались"}
      </h1>

      <p className="mt-4 text-muted">
        {failed ? (
          <>
            Ссылка отписки недействительна или устарела. Отключить рассылку можно
            в личном кабинете, в разделе «Согласия и данные», либо письмом на адрес
            из раздела «Контакты».
          </>
        ) : (
          <>
            Информационные и рекламные сообщения вам больше не придут. Письма об оплате,
            о предстоящем списании и об окончании подписки продолжат приходить — они
            нужны для исполнения договора, и отказаться от них нельзя.
          </>
        )}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/notes"
          className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-medium text-[#0a1220] hover:opacity-90"
        >
          К заметкам
        </Link>
        <Link
          href="/account"
          className="rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:border-brand-blue"
        >
          Личный кабинет
        </Link>
      </div>
    </div>
  );
}

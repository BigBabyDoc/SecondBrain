import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BILLING_PERIODS, PLAN_LABELS, PLAN_PRICES } from "@/lib/access";

export default async function HomePage() {
  const freeNotes = await prisma.note.findMany({
    where: { published: true, tier: "FREE" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-brand-green">
            Заметки для ежедневной практики
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Второй мозг педиатра
          </h1>
          <p className="mt-4 text-xl text-brand-blue">
            Быстро. Удобно. Достоверно.
          </p>
          <p className="mt-6 text-lg text-muted">
            Структурированные клинические заметки, протоколы и разборы случаев —
            в одном месте, без необходимости листать десяток источников на приёме.
            Часть заметок доступна бесплатно, полная библиотека — по подписке.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/notes"
              className="rounded-full bg-brand-blue px-6 py-3 font-medium text-[#0a1220] hover:opacity-90"
            >
              Смотреть заметки
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-border px-6 py-3 font-medium hover:border-brand-green hover:text-brand-green"
            >
              Тарифы
            </Link>
          </div>
        </div>
      </section>

      {freeNotes.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <h2 className="mb-6 text-2xl font-semibold">Бесплатные заметки</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {freeNotes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.slug}`}
                className="rounded-xl border border-border bg-background-elevated p-5 transition hover:border-brand-green"
              >
                <span className="mb-2 inline-block rounded-full bg-brand-green/15 px-2.5 py-0.5 text-xs font-medium text-brand-green">
                  Бесплатно
                </span>
                <h3 className="font-semibold">{note.title}</h3>
                <p className="mt-2 text-sm text-muted line-clamp-3">{note.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-border bg-background-elevated/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-8 text-center text-2xl font-semibold">Тарифы</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex flex-col rounded-2xl border border-border bg-background p-6">
              <h3 className="text-lg font-semibold">Бесплатно</h3>
              <p className="mt-2 text-3xl font-bold">0 ₽</p>
              <p className="mt-3 flex-1 text-sm text-muted">
                Часть заметок в открытом доступе — можно оценить качество и стиль подачи.
              </p>
              <Link
                href="/register"
                className="mt-6 rounded-full border border-border py-2 text-center text-sm font-medium hover:border-brand-blue hover:text-brand-blue"
              >
                Начать бесплатно
              </Link>
            </div>
            {BILLING_PERIODS.map((period) => (
              <div
                key={period}
                className="flex flex-col rounded-2xl border border-border bg-background p-6"
              >
                <h3 className="text-lg font-semibold">Полный доступ · {PLAN_LABELS[period]}</h3>
                <p className="mt-2 text-3xl font-bold">
                  {PLAN_PRICES[period]} ₽
                  <span className="text-base font-normal text-muted">
                    {" "}
                    / {period === "MONTHLY" ? "мес" : "год"}
                  </span>
                </p>
                <p className="mt-3 flex-1 text-sm text-muted">
                  Вся библиотека клинических заметок, протоколов и разборов случаев.
                </p>
                <Link
                  href="/pricing"
                  className="mt-6 rounded-full border border-border py-2 text-center text-sm font-medium hover:border-brand-blue hover:text-brand-blue"
                >
                  Подробнее
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

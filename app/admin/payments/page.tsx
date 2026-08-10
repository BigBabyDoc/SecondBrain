import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BillingPeriod, PLAN_LABELS } from "@/lib/access";
import { AdminNav } from "@/components/admin-nav";

export const metadata = {
  title: "Платежи — админка",
};

/** Сколько строк показываем на странице. */
const PAGE_SIZE = 50;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидает",
  SUCCEEDED: "Оплачен",
  CANCELED: "Отменён",
};

const KIND_LABELS: Record<string, string> = {
  INITIAL: "Оплата",
  RENEWAL: "Автопродление",
};

/**
 * Периоды, за которые считается выручка. Порядок задан массивом: у объекта
 * ключи «30» и «365» — целочисленные, и движок вывел бы их вперёд, независимо
 * от порядка записи.
 */
const RANGES = {
  month: { label: "Текущий месяц", days: null },
  "30": { label: "30 дней", days: 30 },
  "365": { label: "Год", days: 365 },
  all: { label: "Всё время", days: 0 },
} as const;

type RangeKey = keyof typeof RANGES;

const RANGE_ORDER: RangeKey[] = ["month", "30", "365", "all"];

function rangeStart(key: RangeKey, now: Date): Date | null {
  if (key === "all") return null;
  if (key === "month") return new Date(now.getFullYear(), now.getMonth(), 1);

  const start = new Date(now);
  start.setDate(start.getDate() - RANGES[key].days!);
  return start;
}

function isRangeKey(value: string | undefined): value is RangeKey {
  return value !== undefined && value in RANGES;
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string }>;
}) {
  // proxy.ts закрывает /admin по роли, но страница обязана проверить сама:
  // серверный компонент достижим и в обход маршрутизации (RSC-запрос).
  const session = await auth();
  if (session?.user.role !== "ADMIN") notFound();

  const params = await searchParams;
  const range: RangeKey = isRangeKey(params.range) ? params.range : "month";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const since = rangeStart(range, new Date());
  const succeededInRange = {
    status: "SUCCEEDED" as const,
    ...(since ? { createdAt: { gte: since } } : {}),
  };

  const [revenue, payments, total, subscribers, autoRenewCount, pending] =
    await Promise.all([
      // Сумма и число успешных платежей за выбранный период — то, что нужно
      // сверять с «Моим налогом».
      prisma.payment.aggregate({
        where: succeededInRange,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.findMany({
        where: since ? { createdAt: { gte: since } } : {},
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.payment.count({ where: since ? { createdAt: { gte: since } } : {} }),
      prisma.subscription.count({ where: { tier: "PAID" } }),
      prisma.subscription.count({ where: { tier: "PAID", autoRenew: true } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
    ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">Платежи</h1>
      <div className="mt-6">
        <AdminNav current="/admin/payments" />
      </div>

      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        {RANGE_ORDER.map((key) => (
          <a
            key={key}
            href={`/admin/payments?range=${key}`}
            aria-current={key === range ? "true" : undefined}
            className={
              key === range
                ? "rounded-full border border-brand-blue px-4 py-2 text-brand-blue"
                : "rounded-full border border-border px-4 py-2 text-muted hover:border-brand-blue hover:text-brand-blue"
            }
          >
            {RANGES[key].label}
          </a>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={`Выручка · ${RANGES[range].label.toLowerCase()}`}
          value={`${Number(revenue._sum.amount ?? 0).toLocaleString("ru-RU")} ₽`}
          hint={`${revenue._count} успешных платежей`}
        />
        <Stat label="Платных подписок" value={String(subscribers)} />
        <Stat
          label="С автопродлением"
          value={String(autoRenewCount)}
          hint={
            subscribers > 0
              ? `${Math.round((autoRenewCount / subscribers) * 100)}% от платных`
              : undefined
          }
        />
        <Stat
          label="Незавершённых платежей"
          value={String(pending)}
          hint="начали оплату, но не дошли"
        />
      </div>

      {payments.length === 0 ? (
        <p className="mt-8 text-sm text-muted">За выбранный период платежей не было.</p>
      ) : (
        <>
          {/* На телефоне шесть колонок не помещаются, и сумма со статусом
              оказываются за краем экрана — там же, где их никто не найдёт.
              Поэтому до sm то же самое показывается карточками. */}
          <ul className="mt-8 space-y-3 sm:hidden">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="rounded-xl border border-border bg-background-elevated p-4 text-sm"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-semibold">
                    {payment.amount.toString()}{" "}
                    {payment.currency === "RUB" ? "₽" : payment.currency}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(payment.createdAt).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="mt-2 [overflow-wrap:anywhere]">{payment.user.email}</p>
                <p className="mt-1 text-xs text-muted">
                  {PLAN_LABELS[payment.period as BillingPeriod]} ·{" "}
                  {KIND_LABELS[payment.kind] ?? payment.kind} ·{" "}
                  {STATUS_LABELS[payment.status] ?? payment.status}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 hidden overflow-x-auto rounded-xl border border-border sm:block">
          <table className="w-full text-sm">
            <thead className="bg-background-elevated text-left text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Дата</th>
                <th className="px-4 py-2 font-medium">Плательщик</th>
                <th className="px-4 py-2 font-medium">Тариф</th>
                <th className="px-4 py-2 font-medium">Тип</th>
                <th className="px-4 py-2 font-medium">Сумма</th>
                <th className="px-4 py-2 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-2">
                    {new Date(payment.createdAt).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-2 [overflow-wrap:anywhere]">
                    {payment.user.email}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {PLAN_LABELS[payment.period as BillingPeriod]}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-muted">
                    {KIND_LABELS[payment.kind] ?? payment.kind}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {payment.amount.toString()}{" "}
                    {payment.currency === "RUB" ? "₽" : payment.currency}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {STATUS_LABELS[payment.status] ?? payment.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      {pageCount > 1 && (
        <div className="mt-6 flex items-center gap-3 text-sm">
          {page > 1 && (
            <a
              href={`/admin/payments?range=${range}&page=${page - 1}`}
              className="rounded-lg border border-border px-4 py-2 hover:border-brand-blue"
            >
              Назад
            </a>
          )}
          <span className="text-muted">
            Страница {page} из {pageCount}
          </span>
          {page < pageCount && (
            <a
              href={`/admin/payments?range=${range}&page=${page + 1}`}
              className="rounded-lg border border-border px-4 py-2 hover:border-brand-blue"
            >
              Вперёд
            </a>
          )}
        </div>
      )}

      <p className="mt-8 text-xs text-muted">
        Суммы считаются по платежам со статусом «Оплачен». Чеки формируются в «Моём
        налоге» отдельно по каждому платежу — эта таблица нужна для сверки, а не заменяет
        их.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background-elevated p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BILLING_PERIODS, BillingPeriod, PLAN_LABELS, TIER_LABELS, TierName } from "@/lib/access";
import { UpgradeButton } from "@/components/upgrade-button";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активна",
  PENDING: "Ожидает оплаты",
  CANCELED: "Отменена",
  EXPIRED: "Истекла",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [subscription, payments] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.payment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const currentTier = (subscription?.tier as TierName) ?? "FREE";
  const currentPeriod = (subscription?.period as BillingPeriod | null) ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">Личный кабинет</h1>
      <p className="mt-2 text-muted">{session.user.name} · {session.user.email}</p>

      <section className="mt-8 rounded-2xl border border-border bg-background-elevated p-6">
        <h2 className="text-lg font-semibold">Подписка</h2>
        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <div>
            <p className="text-muted">Тариф</p>
            <p className="text-base font-medium">
              {TIER_LABELS[currentTier]}
              {currentPeriod && ` · ${PLAN_LABELS[currentPeriod]}`}
            </p>
          </div>
          <div>
            <p className="text-muted">Статус</p>
            <p className="text-base font-medium">
              {STATUS_LABELS[subscription?.status ?? "ACTIVE"]}
            </p>
          </div>
          {subscription?.currentPeriodEnd && (
            <div>
              <p className="text-muted">Действует до</p>
              <p className="text-base font-medium">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString("ru-RU")}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {BILLING_PERIODS.filter(
            (period) => !(currentTier === "PAID" && currentPeriod === period)
          ).map((period) => (
            <UpgradeButton key={period} period={period} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">История платежей</h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Платежей пока не было.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-background-elevated text-left text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Дата</th>
                  <th className="px-4 py-2 font-medium">Тариф</th>
                  <th className="px-4 py-2 font-medium">Сумма</th>
                  <th className="px-4 py-2 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      {new Date(p.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-4 py-2">
                      {TIER_LABELS[p.tier as TierName]} · {PLAN_LABELS[p.period as BillingPeriod]}
                    </td>
                    <td className="px-4 py-2">
                      {p.amount.toString()} {p.currency}
                    </td>
                    <td className="px-4 py-2">{STATUS_LABELS[p.status] ?? p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

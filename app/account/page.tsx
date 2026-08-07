import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BILLING_PERIODS, BillingPeriod, PLAN_LABELS, TIER_LABELS, TierName } from "@/lib/access";
import { UpgradeButton } from "@/components/upgrade-button";
import { resendVerificationAction } from "@/lib/actions/email-verification";
import {
  cancelSubscriptionAction,
  resumeSubscriptionAction,
} from "@/lib/actions/subscription";
import { AccountPrivacy } from "@/components/account-privacy";
import { AUTO_RENEWAL_ENABLED } from "@/lib/legal";
import { hasActiveConsent } from "@/lib/consents";

export const metadata = {
  title: "Личный кабинет — Второй мозг педиатра",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активна",
  PENDING: "Ожидает оплаты",
  CANCELED: "Автопродление отключено",
  EXPIRED: "Истекла",
};

const NOTICES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  "verified=1": { tone: "ok", text: "Email подтверждён — оплата подписки доступна." },
  "verified=expired": {
    tone: "warn",
    text: "Ссылка подтверждения устарела. Запросите новое письмо.",
  },
  "verified=invalid": {
    tone: "warn",
    text: "Ссылка подтверждения недействительна. Запросите новое письмо.",
  },
  "payment=pending": {
    tone: "ok",
    text: "Платёж обрабатывается. Подписка активируется автоматически после подтверждения от ЮKassa.",
  },
  "payment=unverified": {
    tone: "warn",
    text: "Перед оплатой подтвердите email — на него придёт чек по платежу.",
  },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; payment?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const params = await searchParams;
  const notice =
    (params.verified && NOTICES[`verified=${params.verified}`]) ||
    (params.payment && NOTICES[`payment=${params.payment}`]) ||
    null;

  const [user, subscription, payments, marketingEnabled] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.payment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    hasActiveConsent(session.user.id, "MARKETING"),
  ]);

  const currentTier = (subscription?.tier as TierName) ?? "FREE";
  const currentPeriod = (subscription?.period as BillingPeriod | null) ?? null;
  const isPaid = currentTier === "PAID";
  const isCanceled = subscription?.status === "CANCELED";
  const emailVerified = Boolean(user?.emailVerified);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">Личный кабинет</h1>
      <p className="mt-2 text-muted">{session.user.name} · {session.user.email}</p>

      {notice && (
        <p
          className={`mt-6 rounded-xl border p-4 text-sm ${
            notice.tone === "ok"
              ? "border-brand-green/40 bg-brand-green/10 text-brand-green"
              : "border-amber-400/40 bg-amber-400/10 text-amber-300"
          }`}
        >
          {notice.text}
        </p>
      )}

      {!emailVerified && (
        <div className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          <p className="font-medium text-amber-300">Email не подтверждён</p>
          <p className="mt-1 text-muted">
            Мы отправили письмо со ссылкой на {session.user.email}. Подтверждение нужно, чтобы
            оформить подписку — на этот адрес приходит чек по платежу.
          </p>
          <form action={resendVerificationAction} className="mt-3">
            <button className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-brand-blue hover:text-brand-blue">
              Отправить письмо повторно
            </button>
          </form>
        </div>
      )}

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
              <p className="text-muted">{isCanceled ? "Доступ до" : "Действует до"}</p>
              <p className="text-base font-medium">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString("ru-RU")}
              </p>
            </div>
          )}
        </div>

        {/* Пока автосписание не запущено, обещать «отключение автопродления» нельзя:
            подписка и так не продлевается сама. */}
        {!AUTO_RENEWAL_ENABLED && isPaid && (
          <p className="mt-4 rounded-lg border border-border p-3 text-sm text-muted">
            Подписка не продлевается автоматически: деньги списываются только когда вы сами
            оплачиваете следующий период. По окончании оплаченного срока доступ к платным
            материалам закроется, аккаунт и бесплатные заметки останутся.
          </p>
        )}

        {AUTO_RENEWAL_ENABLED && isCanceled && (
          <p className="mt-4 rounded-lg border border-border p-3 text-sm text-muted">
            Автопродление отключено. Доступ сохраняется до конца оплаченного периода, деньги
            больше списываться не будут.
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {BILLING_PERIODS.filter(
            (period) => !(isPaid && currentPeriod === period && !isCanceled)
          ).map((period) => (
            <UpgradeButton key={period} period={period} disabled={!emailVerified} />
          ))}
        </div>

        {AUTO_RENEWAL_ENABLED && isPaid && (
          <div className="mt-4">
            {isCanceled ? (
              <form action={resumeSubscriptionAction}>
                <button className="text-sm text-brand-blue hover:underline">
                  Возобновить автопродление
                </button>
              </form>
            ) : (
              <form action={cancelSubscriptionAction}>
                <button className="text-sm text-muted hover:text-red-400">
                  Отключить автопродление
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      <AccountPrivacy marketingEnabled={marketingEnabled} />

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

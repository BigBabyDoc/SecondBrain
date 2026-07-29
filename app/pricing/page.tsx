import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  BILLING_PERIODS,
  BillingPeriod,
  PLAN_DESCRIPTIONS,
  PLAN_LABELS,
  PLAN_PRICES,
  TierName,
} from "@/lib/access";
import { UpgradeButton } from "@/components/upgrade-button";

const FREE_FEATURES = [
  "Доступ к бесплатным заметкам",
  "Регистрация за 30 секунд",
  "Без привязки карты",
];

const PAID_FEATURES: Record<BillingPeriod, string[]> = {
  MONTHLY: [
    "Вся библиотека клинических заметок",
    "Шпаргалка с дозировками препаратов",
    "Отмена в любой момент",
  ],
  YEARLY: [
    "Вся библиотека клинических заметок",
    "Шпаргалка с дозировками препаратов",
    "На 2 месяца дешевле, чем помесячно",
  ],
};

export default async function PricingPage() {
  const session = await auth();

  let currentTier: TierName | null = null;
  let currentPeriod: BillingPeriod | null = null;
  if (session?.user) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });
    currentTier = (subscription?.tier as TierName) ?? "FREE";
    currentPeriod = (subscription?.period as BillingPeriod | null) ?? null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold">Тарифы</h1>
        <p className="mt-3 text-muted">
          Часть заметок бесплатна. Полная библиотека — по подписке на 1 месяц или сразу на год
          дешевле.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        <div
          className={`flex flex-col rounded-2xl border p-6 ${
            currentTier === "FREE"
              ? "border-brand-blue bg-background-elevated"
              : "border-border bg-background-elevated/40"
          }`}
        >
          <h2 className="text-lg font-semibold">Бесплатно</h2>
          <p className="mt-2 text-3xl font-bold">0 ₽</p>
          <p className="mt-3 text-sm text-muted">
            Часть заметок в открытом доступе — можно оценить качество и стиль подачи.
          </p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="text-brand-green">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {!session?.user ? (
              <Link
                href="/register"
                className="block rounded-full border border-border py-2 text-center text-sm font-medium hover:border-brand-blue hover:text-brand-blue"
              >
                Начать бесплатно
              </Link>
            ) : currentTier === "FREE" ? (
              <div className="rounded-full bg-brand-green/15 py-2 text-center text-sm font-medium text-brand-green">
                Ваш текущий тариф
              </div>
            ) : (
              <div className="rounded-full border border-border py-2 text-center text-sm text-muted">
                Базовый уровень
              </div>
            )}
          </div>
        </div>

        {BILLING_PERIODS.map((period) => {
          const isCurrent = currentTier === "PAID" && currentPeriod === period;
          return (
            <div
              key={period}
              className={`flex flex-col rounded-2xl border p-6 ${
                isCurrent
                  ? "border-brand-blue bg-background-elevated"
                  : "border-border bg-background-elevated/40"
              }`}
            >
              {period === "YEARLY" && (
                <span className="mb-2 inline-block w-fit rounded-full bg-brand-green/15 px-2.5 py-0.5 text-xs font-medium text-brand-green">
                  Выгоднее
                </span>
              )}
              <h2 className="text-lg font-semibold">Полный доступ · {PLAN_LABELS[period]}</h2>
              <p className="mt-2 text-3xl font-bold">
                {PLAN_PRICES[period]} ₽
                <span className="text-base font-normal text-muted">
                  {" "}
                  / {period === "MONTHLY" ? "мес" : "год"}
                </span>
              </p>
              <p className="mt-3 text-sm text-muted">{PLAN_DESCRIPTIONS[period]}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {PAID_FEATURES[period].map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-brand-green">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {!session?.user ? (
                  <Link
                    href="/register"
                    className="block rounded-full border border-border py-2 text-center text-sm font-medium hover:border-brand-blue hover:text-brand-blue"
                  >
                    Зарегистрироваться
                  </Link>
                ) : isCurrent ? (
                  <div className="rounded-full bg-brand-green/15 py-2 text-center text-sm font-medium text-brand-green">
                    Ваш текущий тариф
                  </div>
                ) : (
                  <UpgradeButton period={period} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

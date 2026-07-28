import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TIER_LABELS, TIER_PRICES, TIER_DESCRIPTIONS, TierName } from "@/lib/access";
import { UpgradeButton } from "@/components/upgrade-button";

const FEATURES: Record<TierName, string[]> = {
  FREE: ["Доступ к бесплатным заметкам", "Регистрация за 30 секунд", "Без привязки карты"],
  BASIC: [
    "Все заметки уровня Free",
    "Полная библиотека базовых клинических заметок",
    "Разборы частых случаев и памятки по дозировкам",
  ],
  PRO: [
    "Всё из тарифа Basic",
    "Расширенные протоколы и редкие случаи",
    "Разборы сложных пациентов",
    "Приоритетные обновления библиотеки",
  ],
};

export default async function PricingPage() {
  const session = await auth();
  const tiers: TierName[] = ["FREE", "BASIC", "PRO"];

  let currentTier: TierName | null = null;
  if (session?.user) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });
    currentTier = (subscription?.tier as TierName) ?? "FREE";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold">Тарифы</h1>
        <p className="mt-3 text-muted">
          Выберите уровень доступа к библиотеке заметок. Подписку можно повысить или изменить
          в любой момент в личном кабинете.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier}
            className={`flex flex-col rounded-2xl border p-6 ${
              currentTier === tier
                ? "border-brand-blue bg-background-elevated"
                : "border-border bg-background-elevated/40"
            }`}
          >
            <h2 className="text-lg font-semibold">{TIER_LABELS[tier]}</h2>
            <p className="mt-2 text-3xl font-bold">
              {TIER_PRICES[tier] === 0 ? "0 ₽" : `${TIER_PRICES[tier]} ₽`}
              {TIER_PRICES[tier] > 0 && (
                <span className="text-base font-normal text-muted"> / мес</span>
              )}
            </p>
            <p className="mt-3 text-sm text-muted">{TIER_DESCRIPTIONS[tier]}</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {FEATURES[tier].map((feature) => (
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
                  {tier === "FREE" ? "Начать бесплатно" : "Зарегистрироваться"}
                </Link>
              ) : currentTier === tier ? (
                <div className="rounded-full bg-brand-green/15 py-2 text-center text-sm font-medium text-brand-green">
                  Ваш текущий тариф
                </div>
              ) : tier === "FREE" ? (
                <div className="rounded-full border border-border py-2 text-center text-sm text-muted">
                  Базовый уровень
                </div>
              ) : (
                <UpgradeButton tier={tier} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

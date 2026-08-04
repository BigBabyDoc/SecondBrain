import { createPaymentAction } from "@/lib/actions/payment";
import { BillingPeriod, PLAN_LABELS, PLAN_PRICES } from "@/lib/access";

export function UpgradeButton({
  period,
  disabled = false,
}: {
  period: BillingPeriod;
  disabled?: boolean;
}) {
  const action = createPaymentAction.bind(null, period);

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={disabled}
        title={disabled ? "Сначала подтвердите email" : undefined}
        className="w-full rounded-full bg-brand-blue py-2 text-sm font-medium text-[#0a1220] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Оформить на {PLAN_LABELS[period]} — {PLAN_PRICES[period]} ₽
      </button>
    </form>
  );
}

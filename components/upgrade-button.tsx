import { createPaymentAction } from "@/lib/actions/payment";
import { BillingPeriod, PLAN_LABELS, PLAN_PRICES } from "@/lib/access";

export function UpgradeButton({ period }: { period: BillingPeriod }) {
  const action = createPaymentAction.bind(null, period);

  return (
    <form action={action}>
      <button
        type="submit"
        className="w-full rounded-full bg-brand-blue py-2 text-sm font-medium text-[#0a1220] hover:opacity-90"
      >
        Оформить на {PLAN_LABELS[period]} — {PLAN_PRICES[period]} ₽
      </button>
    </form>
  );
}

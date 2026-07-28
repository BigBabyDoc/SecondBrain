import { createPaymentAction } from "@/lib/actions/payment";
import { TierName, TIER_LABELS } from "@/lib/access";

export function UpgradeButton({ tier }: { tier: TierName }) {
  const action = createPaymentAction.bind(null, tier);

  return (
    <form action={action}>
      <button
        type="submit"
        className="w-full rounded-full bg-brand-blue py-2 text-sm font-medium text-[#0a1220] hover:opacity-90"
      >
        Оформить «{TIER_LABELS[tier]}»
      </button>
    </form>
  );
}

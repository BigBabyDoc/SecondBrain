import { createPaymentAction } from "@/lib/actions/payment";
import {
  BillingPeriod,
  PLAN_LABELS,
  PLAN_PRICES,
  PLAN_RENEWAL_CADENCE,
} from "@/lib/access";
import { AUTO_RENEWAL_ENABLED } from "@/lib/legal";
import { RENEWAL_NOTICE_DAYS } from "@/lib/renewal";
import { PaySubmitButton } from "@/components/pay-submit-button";

export function UpgradeButton({
  period,
  disabled = false,
}: {
  period: BillingPeriod;
  disabled?: boolean;
}) {
  const action = createPaymentAction.bind(null, period);
  const checkboxId = `auto-renew-${period}`;

  return (
    <form action={action} className="flex flex-col gap-2">
      {/* Отметка идёт до кнопки и снята по умолчанию: п. 8.1.2 оферты требует
          оставить возможность заплатить без привязки карты, а решение о
          списаниях должно приниматься до оплаты, а не замечаться после неё.
          В тексте — всё, что положено раскрыть по п. 8.1.3: сумма,
          периодичность, дата первого списания и порядок отмены. */}
      {AUTO_RENEWAL_ENABLED && (
        <label
          htmlFor={checkboxId}
          className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 text-xs text-muted"
        >
          <input
            id={checkboxId}
            type="checkbox"
            name="autoRenew"
            disabled={disabled}
            className="mt-0.5 size-4 shrink-0 accent-brand-blue"
          />
          <span>
            Продлевать автоматически: {PLAN_PRICES[period]} ₽{" "}
            {PLAN_RENEWAL_CADENCE[period]}, первое списание — в день окончания
            оплаченного периода. Предупредим письмом за {RENEWAL_NOTICE_DAYS} дня;
            отключить можно в кабинете в одно действие.
          </span>
        </label>
      )}

      <PaySubmitButton
        disabled={disabled}
        title={disabled ? "Сначала подтвердите email" : undefined}
      >
        Оформить на {PLAN_LABELS[period]} — {PLAN_PRICES[period]} ₽
      </PaySubmitButton>
    </form>
  );
}

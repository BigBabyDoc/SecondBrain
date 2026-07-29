import { randomUUID } from "crypto";
import { PLAN_LABELS, PLAN_PRICES, BillingPeriod } from "@/lib/access";

const API_BASE = "https://api.yookassa.ru/v3";

function authHeader() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) {
    throw new Error(
      "ЮKassa не настроена: заполните YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в .env"
    );
  }
  return "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64");
}

export type YookassaPayment = {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  paid: boolean;
  amount: { value: string; currency: string };
  confirmation?: { confirmation_url: string };
  payment_method?: { id: string; saved: boolean };
  metadata?: Record<string, string>;
};

export async function createYookassaPayment(params: {
  userId: string;
  period: BillingPeriod;
  returnUrl: string;
}): Promise<YookassaPayment> {
  const amount = PLAN_PRICES[params.period].toFixed(2);

  const res = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotence-Key": randomUUID(),
    },
    body: JSON.stringify({
      amount: { value: amount, currency: "RUB" },
      capture: true,
      save_payment_method: true,
      confirmation: {
        type: "redirect",
        return_url: params.returnUrl,
      },
      description: `Подписка «${PLAN_LABELS[params.period]}» — Второй мозг педиатра`,
      metadata: { userId: params.userId, period: params.period },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ошибка создания платежа ЮKassa: ${res.status} ${text}`);
  }

  return res.json();
}

export async function fetchYookassaPayment(paymentId: string): Promise<YookassaPayment> {
  const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ошибка получения платежа ЮKassa: ${res.status} ${text}`);
  }

  return res.json();
}

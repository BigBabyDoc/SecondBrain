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
  payment_method?: {
    id: string;
    saved: boolean;
    /** Есть только у типа bank_card; полный номер карты API не возвращает. */
    card?: { last4?: string; card_type?: string };
  };
  metadata?: Record<string, string>;
};

/** Маска привязанной карты для показа пользователю: «•••• 4242 · MIR». */
export function cardMask(payment: YookassaPayment): {
  last4: string | null;
  network: string | null;
} {
  const card = payment.payment_method?.card;
  return {
    last4: card?.last4 ?? null,
    // "Unknown" ЮKassa присылает, когда платёжную систему определить не удалось —
    // показывать это слово пользователю бессмысленно.
    network: card?.card_type && card.card_type !== "Unknown" ? card.card_type : null,
  };
}

export function planDescription(period: BillingPeriod): string {
  return `Подписка «${PLAN_LABELS[period]}» — Второй мозг педиатра`;
}

/**
 * Чек обязателен в каждом платеже, включая автосписания (п. 6.6 оферты):
 * без него самозанятый не проведёт продажу через «Мой налог». Требует
 * включённой отправки чеков в кабинете ЮKassa. ФИО и ИНН в API не передаются —
 * они привязаны к магазину на стороне ЮKassa при подключении «Моего налога».
 */
function receiptFor(period: BillingPeriod, userEmail: string, amount: string) {
  return {
    customer: { email: userEmail },
    items: [
      {
        description: planDescription(period),
        quantity: "1.00",
        amount: { value: amount, currency: "RUB" },
        vat_code: 1,
        payment_mode: "full_payment",
        payment_subject: "service",
      },
    ],
  };
}

async function postPayment(
  body: Record<string, unknown>,
  idempotenceKey: string
): Promise<YookassaPayment> {
  const res = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ошибка создания платежа ЮKassa: ${res.status} ${text}`);
  }

  return res.json();
}

export async function createYookassaPayment(params: {
  userId: string;
  userEmail: string;
  period: BillingPeriod;
  returnUrl: string;
  /** Привязывать ли платёжное средство для последующих автосписаний. */
  saveMethod: boolean;
}): Promise<YookassaPayment> {
  const amount = PLAN_PRICES[params.period].toFixed(2);

  return postPayment(
    {
      amount: { value: amount, currency: "RUB" },
      capture: true,
      save_payment_method: params.saveMethod,
      confirmation: { type: "redirect", return_url: params.returnUrl },
      description: planDescription(params.period),
      metadata: {
        userId: params.userId,
        period: params.period,
        // Флаг переживает редирект на ЮKassa и возвращается в вебхуке:
        // сохранённое средство само по себе не означает согласия на списания.
        autoRenew: params.saveMethod ? "1" : "0",
      },
      receipt: receiptFor(params.period, params.userEmail, amount),
    },
    randomUUID()
  );
}

/**
 * Автосписание по ранее сохранённому средству. Подтверждения от пользователя
 * здесь нет, поэтому блока `confirmation` тоже нет — платёж уходит сразу.
 *
 * Ключ идемпотентности задаётся вызывающим кодом и обязан быть детерминированным:
 * если задача продления упадёт между запросом и записью в базу, повтор с тем же
 * ключом вернёт тот же платёж, а не спишет деньги второй раз.
 */
export async function chargeSavedMethod(params: {
  userId: string;
  userEmail: string;
  period: BillingPeriod;
  methodId: string;
  amount: number;
  idempotenceKey: string;
}): Promise<YookassaPayment> {
  const amount = params.amount.toFixed(2);

  return postPayment(
    {
      amount: { value: amount, currency: "RUB" },
      capture: true,
      payment_method_id: params.methodId,
      description: planDescription(params.period),
      metadata: {
        userId: params.userId,
        period: params.period,
        autoRenew: "1",
        kind: "renewal",
      },
      receipt: receiptFor(params.period, params.userEmail, amount),
    },
    params.idempotenceKey
  );
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

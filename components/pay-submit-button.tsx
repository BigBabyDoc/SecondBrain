"use client";

import { METRIKA_GOALS, reachGoal } from "@/lib/metrika";

/**
 * Кнопка оплаты. Отдельный клиентский компонент нужен ровно ради одной вещи —
 * отметить начало оплаты в Метрике до ухода на ЮKassa: с сайта пользователь
 * уходит на чужой домен, и там мы его уже не видим.
 *
 * Цель отправляется в обработчике клика, а не в submit: форма всё равно уйдёт,
 * и отмена цели не нужна — «начал оплату» это и есть нажатие.
 */
export function PaySubmitButton({
  children,
  disabled,
  title,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      title={title}
      onClick={() => reachGoal(METRIKA_GOALS.paymentStarted)}
      className="w-full rounded-full bg-brand-blue py-2.5 text-sm font-medium text-[#0a1220] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

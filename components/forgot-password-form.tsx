"use client";

import { useActionState } from "react";
import {
  ForgotPasswordState,
  requestPasswordResetAction,
} from "@/lib/actions/password-reset";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordResetAction,
    {}
  );

  if (state.sent) {
    return (
      <div className="mt-8 rounded-xl border border-border bg-background-elevated p-5 text-sm">
        <p className="font-medium">Проверьте почту</p>
        <p className="mt-2 text-muted">
          Если аккаунт с таким адресом существует, мы отправили на него ссылку для смены
          пароля. Ссылка действует 60 минут.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand-blue"
        />
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-blue py-2.5 font-medium text-[#0a1220] hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Отправляем..." : "Отправить ссылку"}
      </button>
    </form>
  );
}

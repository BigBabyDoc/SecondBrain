"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ResetPasswordState, resetPasswordAction } from "@/lib/actions/password-reset";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    {}
  );

  if (state.done) {
    return (
      <div className="mt-8 rounded-xl border border-border bg-background-elevated p-5 text-sm">
        <p className="font-medium">Пароль изменён</p>
        <p className="mt-2 text-muted">
          Теперь можно{" "}
          <Link href="/login" className="text-brand-blue hover:underline">
            войти с новым паролем
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="block text-sm text-muted">
          Новый пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand-blue"
        />
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-blue py-2.5 font-medium text-[#0a1220] hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Сохраняем..." : "Сохранить пароль"}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, LoginState } from "@/lib/actions/login";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
      <div>
        <label htmlFor="password" className="block text-sm text-muted">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand-blue"
        />
      </div>
      <div className="text-right">
        <Link href="/forgot-password" className="text-sm text-muted hover:text-brand-blue">
          Забыли пароль?
        </Link>
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-blue py-2.5 font-medium text-[#0a1220] hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Входим..." : "Войти"}
      </button>
    </form>
  );
}

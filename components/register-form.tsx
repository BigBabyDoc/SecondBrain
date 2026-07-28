"use client";

import { useActionState } from "react";
import { registerAction, RegisterState } from "@/lib/actions/auth";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerAction,
    {}
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm text-muted">
          Имя
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand-blue"
        />
      </div>
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
          minLength={8}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand-blue"
        />
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-green py-2.5 font-medium text-[#0a1220] hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Создаём аккаунт..." : "Зарегистрироваться"}
      </button>
    </form>
  );
}

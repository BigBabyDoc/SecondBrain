"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, RegisterState } from "@/lib/actions/auth";

function Checkbox({
  name,
  required,
  children,
}: {
  name: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-muted">
      {/* Отметки не предустановлены: согласие должно быть активным действием. */}
      <input type="checkbox" name={name} required={required} className="mt-1 shrink-0" />
      <span>
        {children}
        {!required && <span className="text-xs"> — по желанию</span>}
      </span>
    </label>
  );
}

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

      <div className="space-y-3 rounded-xl border border-border bg-background-elevated/40 p-4">
        <Checkbox name="terms" required>
          Я принимаю{" "}
          <Link href="/terms" className="text-brand-blue hover:underline">
            Пользовательское соглашение
          </Link>{" "}
          и{" "}
          <Link href="/oferta" className="text-brand-blue hover:underline">
            Публичную оферту
          </Link>
        </Checkbox>

        <Checkbox name="personalData" required>
          Я даю{" "}
          <Link href="/consents" className="text-brand-blue hover:underline">
            согласие на обработку персональных данных
          </Link>{" "}
          и ознакомлен с{" "}
          <Link href="/privacy" className="text-brand-blue hover:underline">
            Политикой обработки персональных данных
          </Link>
        </Checkbox>

        <Checkbox name="professionalStatus" required>
          Я являюсь медицинским или фармацевтическим работником либо получаю медицинское
          образование, и мне исполнилось 18 лет
        </Checkbox>

        <Checkbox name="marketing">
          Я согласен получать информационные и рекламные сообщения
        </Checkbox>
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

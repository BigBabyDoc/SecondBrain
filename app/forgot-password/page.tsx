import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = {
  title: "Восстановление пароля — Второй мозг педиатра",
  description: "Восстановление доступа к аккаунту сервиса «Второй мозг педиатра».",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Восстановление пароля</h1>
      <p className="mt-2 text-sm text-muted">
        Укажите email, на который зарегистрирован аккаунт — пришлём ссылку для смены пароля.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-sm text-muted">
        Вспомнили пароль?{" "}
        <Link href="/login" className="text-brand-blue hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}

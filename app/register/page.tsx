import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export const metadata = {
  title: "Регистрация — Второй мозг педиатра",
  description:
    "Создайте аккаунт, чтобы читать клинические заметки педиатра и оформить подписку.",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Регистрация</h1>
      <p className="mt-2 text-sm text-muted">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-brand-blue hover:underline">
          Войти
        </Link>
      </p>
      <RegisterForm />
    </div>
  );
}

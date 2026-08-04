import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = {
  title: "Новый пароль — Второй мозг педиатра",
  description: "Установка нового пароля по ссылке из письма.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold">Ссылка недействительна</h1>
        <p className="mt-2 text-sm text-muted">
          В ссылке нет токена. Запросите{" "}
          <Link href="/forgot-password" className="text-brand-blue hover:underline">
            новое письмо для смены пароля
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Новый пароль</h1>
      <p className="mt-2 text-sm text-muted">Придумайте пароль не короче 8 символов.</p>
      <ResetPasswordForm token={token} />
    </div>
  );
}

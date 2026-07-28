import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/notes";

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Вход</h1>
      <p className="mt-2 text-sm text-muted">
        Нет аккаунта?{" "}
        <Link href="/register" className="text-brand-blue hover:underline">
          Зарегистрироваться
        </Link>
      </p>
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}

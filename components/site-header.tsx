import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/logo";
import { MobileNav, MobileNavLink } from "@/components/mobile-nav";

export async function SiteHeader() {
  const session = await auth();

  const links: MobileNavLink[] = [
    { href: "/notes", label: "Заметки" },
    { href: "/pricing", label: "Тарифы" },
    { href: "/faq", label: "Вопросы и ответы" },
  ];
  if (session?.user.role === "ADMIN") {
    links.push({ href: "/admin/notes", label: "Админка" });
  }
  if (session?.user) {
    links.push({ href: "/account", label: "Личный кабинет" });
  } else {
    links.push({ href: "/register", label: "Регистрация" });
  }

  return (
    <header className="relative border-b border-border bg-background-elevated/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
          <Link href="/notes" className="hover:text-foreground">
            Заметки
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Тарифы
          </Link>
          <Link href="/faq" className="hover:text-foreground">
            Вопросы
          </Link>
          {session?.user.role === "ADMIN" && (
            <Link href="/admin/notes" className="hover:text-foreground">
              Админка
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              <Link
                href="/account"
                className="hidden text-sm text-muted hover:text-foreground sm:inline"
              >
                {session.user.name}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-brand-blue hover:text-brand-blue">
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-muted hover:text-foreground">
                Войти
              </Link>
              <Link
                href="/register"
                className="hidden rounded-full bg-brand-blue px-4 py-1.5 text-sm font-medium text-[#0a1220] hover:opacity-90 sm:inline-block"
              >
                Регистрация
              </Link>
            </>
          )}
          <MobileNav links={links} />
        </div>
      </div>
    </header>
  );
}

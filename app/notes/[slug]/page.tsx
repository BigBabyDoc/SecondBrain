import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TIER_LABELS, TierName, hasTierAccess } from "@/lib/access";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const note = await prisma.note.findUnique({ where: { slug } });
  if (!note || !note.published) notFound();

  const session = await auth();
  let userTier: TierName = "FREE";
  if (session?.user) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });
    userTier = (subscription?.tier as TierName) ?? "FREE";
  }

  const requiredTier = note.tier as TierName;
  const hasAccess = hasTierAccess(userTier, requiredTier);

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/notes" className="text-sm text-muted hover:text-foreground">
        ← Все заметки
      </Link>

      <span className="mt-4 inline-block rounded-full bg-brand-blue/15 px-2.5 py-0.5 text-xs font-medium text-brand-blue">
        {TIER_LABELS[requiredTier]}
      </span>
      <h1 className="mt-3 text-3xl font-bold">{note.title}</h1>
      <p className="mt-3 text-muted">{note.excerpt}</p>

      {note.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {note.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 border-t border-border pt-8">
        {hasAccess ? (
          <>
            <div className="max-w-none whitespace-pre-wrap leading-relaxed text-[15px]">
              {note.content}
            </div>
            <p className="mt-8 rounded-xl border border-border bg-background-elevated/40 p-4 text-xs text-muted">
              ⚠️ Информация носит справочный характер, основана на общих клинических
              рекомендациях и не заменяет решение лечащего врача с учётом конкретного пациента.
              Автор не несёт ответственности за использование материалов без клинической
              проверки.
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-background-elevated p-8 text-center">
            <p className="text-lg font-semibold">
              Эта заметка доступна на тарифе «{TIER_LABELS[requiredTier]}»
            </p>
            <p className="mt-2 text-sm text-muted">
              {session?.user
                ? "Повысьте тариф в личном кабинете, чтобы открыть полный текст."
                : "Войдите или зарегистрируйтесь, чтобы оформить подписку."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {session?.user ? (
                <Link
                  href="/account"
                  className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-medium text-[#0a1220] hover:opacity-90"
                >
                  Перейти в кабинет
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-medium text-[#0a1220] hover:opacity-90"
                  >
                    Регистрация
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:border-brand-blue"
                  >
                    Войти
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

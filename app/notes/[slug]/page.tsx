import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TIER_LABELS, TierName, hasTierAccess } from "@/lib/access";
import { Markdown } from "@/components/markdown";
import { NoteToc } from "@/components/note-toc";
import { BackToTop } from "@/components/back-to-top";
import { NotePreview } from "@/components/note-preview";
import { ViewCounter } from "@/components/view-counter";
import { extractHeadings, leadParagraph } from "@/lib/toc";

/** Сутки: ниже этого порога правку считаем частью публикации, а не обновлением. */
const DAY_MS = 86_400_000;

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = await prisma.note.findUnique({ where: { slug } });

  if (!note || !note.published) {
    return { title: "Заметка не найдена — Второй мозг педиатра" };
  }

  return {
    title: `${note.title} — Второй мозг педиатра`,
    description: note.excerpt,
    keywords: note.tags,
    openGraph: {
      title: note.title,
      description: note.excerpt,
      type: "article",
    },
  };
}

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

  // Заголовки нужны в обоих случаях: открытой заметке — как оглавление,
  // закрытой — как витрина. Сам текст в браузер по-прежнему не уходит.
  const headings = extractHeadings(note.content);
  const lead = hasAccess ? "" : leadParagraph(note.content);

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <ViewCounter slug={note.slug} />
      {/* Флекс с gap, а не пробел в разметке: JSX съедает пробел между
          элементами, если между ними перенос строки. */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/notes" className="-my-2 py-2 text-sm text-muted hover:text-foreground">
          ← Все заметки
        </Link>

        <span className="rounded-full bg-brand-blue/15 px-2.5 py-0.5 text-xs font-medium text-brand-blue">
          {TIER_LABELS[requiredTier]}
        </span>
      </div>
      <h1 className="mt-3 text-3xl font-bold [overflow-wrap:anywhere]">{note.title}</h1>
      <p className="mt-3 text-muted [overflow-wrap:anywhere]">{note.excerpt}</p>

      {/* Пункт 4.6 Пользовательского соглашения обещает указывать эти даты.
          Для справочника по клиническим рекомендациям это не формальность:
          по дате обновления читатель судит, насколько материал успел устареть.
          Обновление показываем, только если оно было позже публикации. */}
      <p className="mt-3 text-xs text-muted">
        <time dateTime={note.createdAt.toISOString()}>
          Опубликовано {formatDate(note.createdAt)}
        </time>
        {note.updatedAt.getTime() - note.createdAt.getTime() > DAY_MS && (
          <>
            {" · "}
            <time dateTime={note.updatedAt.toISOString()}>
              обновлено {formatDate(note.updatedAt)}
            </time>
          </>
        )}
      </p>

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
            <NoteToc headings={headings} />
            <Markdown headings={headings}>{note.content}</Markdown>
            <BackToTop />
            <p className="mt-8 rounded-xl border border-border bg-background-elevated/40 p-4 text-xs text-muted">
              ⚠️ Информация носит справочный характер, основана на общих клинических
              рекомендациях и не заменяет решение лечащего врача с учётом конкретного пациента.
              Автор не несёт ответственности за использование материалов без клинической
              проверки.
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-background-elevated p-6 text-center sm:p-8">
            <NotePreview headings={headings} lead={lead} />

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

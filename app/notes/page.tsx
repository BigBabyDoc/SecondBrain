import Link from "next/link";
import { NoteSearch } from "@/components/note-search";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TIER_LABELS, TierName, hasTierAccess } from "@/lib/access";
import { METRIKA_GOALS, MetrikaGoal } from "@/components/metrika-goal";

export const metadata = {
  title: "Заметки — Второй мозг педиатра",
  description:
    "Каталог клинических заметок педиатра: протоколы, дозировки, разборы случаев. Часть материалов открыта бесплатно.",
};

const PAGE_SIZE = 12;

const TIER_BADGE_CLASS: Record<TierName, string> = {
  FREE: "bg-brand-green/15 text-brand-green",
  PAID: "bg-brand-blue/15 text-brand-blue",
};

/** Ссылка на страницу каталога с сохранением активных фильтров. */
function buildHref(params: { q: string; tag: string; page: number }): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.tag) search.set("tag", params.tag);
  if (params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `/notes?${qs}` : "/notes";
}

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; page?: string; registered?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const session = await auth();
  // Метка регистрации приходит только с редиректа после signIn — по ней
  // отмечается цель в Метрике. Учитываем её лишь для вошедшего пользователя,
  // чтобы ссылка с параметром, отправленная кому-то ещё, ничего не считала.
  const justRegistered = params.registered === "1" && Boolean(session?.user);
  let userTier: TierName = "FREE";
  if (session?.user) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });
    userTier = (subscription?.tier as TierName) ?? "FREE";
  }

  const where = {
    published: true,
    // Ищем и по тексту заметки: подсказки в строке поиска находят упоминания
    // внутри текста, и по Enter результат должен быть тем же.
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { excerpt: { contains: q, mode: "insensitive" as const } },
            { content: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const [notes, total, tagSource] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.note.count({ where }),
    // Облако тегов строится по всей библиотеке, а не по текущей странице.
    prisma.note.findMany({ where: { published: true }, select: { tags: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allTags = Array.from(new Set(tagSource.flatMap((n) => n.tags))).sort();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      {justRegistered && (
        <MetrikaGoal goal={METRIKA_GOALS.registration} dedupeKey={session?.user.id} />
      )}

      <h1 className="text-3xl font-bold">Заметки</h1>
      <p className="mt-2 text-muted">
        Клинические заметки педиатра. Часть — в открытом доступе, остальные открываются по
        подписке.
      </p>

      <form className="mt-6 flex flex-wrap gap-3" action="/notes" method="GET">
        <NoteSearch defaultValue={q} />
        {tag && <input type="hidden" name="tag" value={tag} />}
        <button
          type="submit"
          className="rounded-lg border border-border px-4 py-2 text-sm hover:border-brand-blue"
        >
          Найти
        </button>
      </form>

      {allTags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            href={buildHref({ q, tag: "", page: 1 })}
            className={`rounded-full border px-3 py-2 ${
              !tag ? "border-brand-blue text-brand-blue" : "border-border text-muted"
            }`}
          >
            Все теги
          </Link>
          {allTags.map((t) => (
            <Link
              key={t}
              href={buildHref({ q, tag: t, page: 1 })}
              className={`rounded-full border px-3 py-2 ${
                tag === t ? "border-brand-blue text-brand-blue" : "border-border text-muted"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {notes.map((note) => {
          const locked = !hasTierAccess(userTier, note.tier as TierName);
          return (
            <Link
              key={note.id}
              href={`/notes/${note.slug}`}
              className="flex flex-col rounded-xl border border-border bg-background-elevated p-5 transition hover:border-brand-blue"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_BADGE_CLASS[note.tier as TierName]}`}
                >
                  {TIER_LABELS[note.tier as TierName]}
                </span>
                {locked && <span className="text-muted">🔒</span>}
              </div>
              <h2 className="mt-2 font-semibold [overflow-wrap:anywhere]">{note.title}</h2>
              <p className="mt-2 text-sm text-muted line-clamp-3 [overflow-wrap:anywhere]">
                {note.excerpt}
              </p>
              {note.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {note.tags.map((t) => (
                    <span key={t} className="text-xs text-muted">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {notes.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-muted">Ничего не найдено.</p>
          {/* Со страницы за пределом каталога иначе не выбраться: навигации
              там нет, и остаётся только править адрес вручную. */}
          {(page > 1 || q || tag) && (
            <Link
              href="/notes"
              className="mt-4 inline-block rounded-lg border border-border px-4 py-2 text-sm hover:border-brand-blue hover:text-brand-blue"
            >
              Показать все заметки
            </Link>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Постраничная навигация"
          className="mt-10 flex items-center justify-center gap-3 text-sm"
        >
          {page > 1 ? (
            <Link
              href={buildHref({ q, tag, page: page - 1 })}
              className="rounded-lg border border-border px-4 py-2 hover:border-brand-blue"
            >
              ← Назад
            </Link>
          ) : (
            <span className="rounded-lg border border-border px-4 py-2 text-muted opacity-50">
              ← Назад
            </span>
          )}

          <span className="text-muted">
            Стр. {page} из {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={buildHref({ q, tag, page: page + 1 })}
              className="rounded-lg border border-border px-4 py-2 hover:border-brand-blue"
            >
              Вперёд →
            </Link>
          ) : (
            <span className="rounded-lg border border-border px-4 py-2 text-muted opacity-50">
              Вперёд →
            </span>
          )}
        </nav>
      )}
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TIER_LABELS, TierName, hasTierAccess } from "@/lib/access";

const TIER_BADGE_CLASS: Record<TierName, string> = {
  FREE: "bg-brand-green/15 text-brand-green",
  PAID: "bg-brand-blue/15 text-brand-blue",
};

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";

  const session = await auth();
  let userTier: TierName = "FREE";
  if (session?.user) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });
    userTier = (subscription?.tier as TierName) ?? "FREE";
  }

  const notes = await prisma.note.findMany({
    where: {
      published: true,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { excerpt: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">Заметки</h1>
      <p className="mt-2 text-muted">
        Клинические заметки педиатра. Часть — в открытом доступе, остальные открываются по
        подписке.
      </p>

      <form className="mt-6 flex flex-wrap gap-3" action="/notes" method="GET">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Поиск по заметкам..."
          className="min-w-0 flex-1 rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
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
            href="/notes"
            className={`rounded-full border px-3 py-1 ${
              !tag ? "border-brand-blue text-brand-blue" : "border-border text-muted"
            }`}
          >
            Все теги
          </Link>
          {allTags.map((t) => (
            <Link
              key={t}
              href={`/notes?tag=${encodeURIComponent(t)}`}
              className={`rounded-full border px-3 py-1 ${
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
              <h3 className="mt-2 font-semibold">{note.title}</h3>
              <p className="mt-2 text-sm text-muted line-clamp-3">{note.excerpt}</p>
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
        <p className="mt-8 text-center text-muted">Ничего не найдено.</p>
      )}
    </div>
  );
}

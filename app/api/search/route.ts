import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MIN_QUERY_LENGTH,
  SUGGESTION_LIMIT,
  normalizeQuery,
  orderByTitleRank,
  type Suggestion,
} from "@/lib/search";

/**
 * Подсказки для строки поиска. Каталог открыт всем, поэтому эндпоинт публичный,
 * но отдаёт только заголовок и аннотацию — то же, что видно в каталоге. Кусок
 * текста заметки сюда не попадает никогда: у платных заметок это была бы дыра
 * в пейволле мимо серверной проверки в `app/notes/[slug]/page.tsx`.
 */
export async function GET(request: Request) {
  const query = normalizeQuery(new URL(request.url).searchParams.get("q"));
  if (query.length < MIN_QUERY_LENGTH) return NextResponse.json({ suggestions: [] });

  const insensitive = { contains: query, mode: "insensitive" as const };
  const select = { id: true, slug: true, title: true, excerpt: true, tier: true };

  // Первый приоритет — заголовок. Второй — текст заметки, и только то, что не
  // нашлось по заголовку: иначе одна заметка встанет в списке дважды.
  const byTitle = await prisma.note.findMany({
    where: { published: true, title: insensitive },
    select,
    take: SUGGESTION_LIMIT,
  });

  const rest = SUGGESTION_LIMIT - byTitle.length;
  const byContent =
    rest > 0
      ? await prisma.note.findMany({
          where: {
            published: true,
            id: { notIn: byTitle.map((note) => note.id) },
            OR: [{ content: insensitive }, { excerpt: insensitive }],
          },
          select,
          orderBy: { title: "asc" },
          take: rest,
        })
      : [];

  const suggestions: Suggestion[] = [
    ...orderByTitleRank(query, byTitle).map((note) => toSuggestion(note, "title")),
    ...byContent.map((note) => toSuggestion(note, "content")),
  ];

  return NextResponse.json({ suggestions });
}

function toSuggestion(
  note: { slug: string; title: string; excerpt: string; tier: string },
  match: Suggestion["match"]
): Suggestion {
  return {
    slug: note.slug,
    title: note.title,
    excerpt: note.excerpt,
    tier: note.tier,
    match,
  };
}

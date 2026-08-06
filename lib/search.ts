export const MIN_QUERY_LENGTH = 2;
export const SUGGESTION_LIMIT = 8;
/** Длинные строки в подсказках не нужны, а запрос по ним нагружает базу. */
export const MAX_QUERY_LENGTH = 100;

const WORD_CHARACTER = /[\p{L}\p{N}]/u;

export type SuggestionMatch = "title" | "content";

export type Suggestion = {
  slug: string;
  title: string;
  excerpt: string;
  tier: string;
  match: SuggestionMatch;
};

export const MATCH_HEADINGS: Record<SuggestionMatch, string> = {
  title: "В заголовках",
  content: "Упоминается в тексте",
};

/**
 * Подпись группы перед подсказкой — или `null`, если предыдущая подсказка уже
 * из этой группы. Считается по типу совпадения, а не по номеру в списке:
 * совпадений по заголовку может не быть вовсе, и тогда первой идёт находка в
 * тексте, которую нельзя подписывать «В заголовках».
 */
export function groupHeadingAt(
  suggestions: { match: SuggestionMatch }[],
  index: number
): string | null {
  const current = suggestions[index];
  if (!current) return null;

  const previous = suggestions[index - 1];
  return previous?.match === current.match ? null : MATCH_HEADINGS[current.match];
}

export function normalizeQuery(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);
}

/**
 * Место совпадения внутри заголовка: точное → начало → слово → середина слова.
 * «Колики» должны опережать «Младенческие колики UpToDate», а тот — заметку,
 * где запрос встретился внутри слова.
 */
export function titleRank(query: string, title: string): number {
  const needle = query.toLowerCase();
  const haystack = title.toLowerCase();

  if (haystack === needle) return 0;
  if (haystack.startsWith(needle)) return 1;

  // Границу слова ищем вручную: `\b` в JavaScript считает буквой только латиницу,
  // поэтому для «колит» в «язвенный колит» он границы не видит и весь этот
  // уровень для русских заголовков был бы недостижим.
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
    if (!WORD_CHARACTER.test(haystack[at - 1])) return 2;
  }

  return haystack.includes(needle) ? 3 : 4;
}

/**
 * Сортировка совпадений по заголовку. При равном ранге — короткий заголовок
 * выше: он ближе к запросу по смыслу, длинный лишь содержит его как часть.
 */
export function orderByTitleRank<T extends { title: string }>(query: string, items: T[]): T[] {
  return [...items].sort((a, b) => {
    const rank = titleRank(query, a.title) - titleRank(query, b.title);
    if (rank !== 0) return rank;

    const length = a.title.length - b.title.length;
    return length !== 0 ? length : a.title.localeCompare(b.title, "ru");
  });
}

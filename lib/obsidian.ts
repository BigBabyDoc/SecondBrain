/**
 * Перевод заметок Obsidian в тот Markdown, который умеет рендерить
 * `components/markdown.tsx` (react-markdown + remark-gfm).
 *
 * Obsidian пишет в файл несколько своих расширений синтаксиса, и ни одно из них
 * не является стандартным Markdown: вики-ссылки `[[Заметка]]`, встраивание
 * файлов `![[картинка.png]]` и коллауты `> [!Note]`. Без перевода они попадают
 * на сайт как сырой текст в квадратных скобках.
 */

export type WikilinkResolver = (target: string) => string | null;

/**
 * Отдаёт готовую Markdown-разметку для вложения (`![подпись](/api/media/…)`)
 * или `null`, если файла нет — тогда встраивание убирается из текста.
 */
export type EmbedResolver = (name: string) => string | null;

export type ConversionResult = {
  content: string;
  /** Имена встроенных файлов, которые пришлось выбросить. */
  droppedEmbeds: string[];
  /** Цели вики-ссылок, для которых не нашлось заметки. */
  unresolvedLinks: string[];
};

// Встраивание файла отличается от встраивания заметки только расширением в имени.
const ATTACHMENT = /\.[a-z0-9]{1,5}$/i;

// Подписи коллаутов по-русски: тип берётся из `> [!Note]`, текст остаётся как есть.
const CALLOUT_LABELS: Record<string, string> = {
  note: "Примечание",
  info: "Справка",
  todo: "Задача",
  tip: "Совет",
  hint: "Совет",
  success: "Важно знать",
  question: "Вопрос",
  warning: "Внимание",
  caution: "Осторожно",
  attention: "Внимание",
  failure: "Ошибка",
  danger: "Опасно",
  bug: "Ошибка",
  example: "Пример",
  quote: "Цитата",
  abstract: "Кратко",
  summary: "Кратко",
};

const CALLOUT_LINE = /^>\s*\[!\s*([A-Za-zА-Яа-я-]+)\s*\][-+]?\s*(.*)$/;
const EMBED = /!\[\[([^\]]+?)\]\]/g;
const WIKILINK = /\[\[([^\]|#]+?)(?:#([^\]|]+?))?(?:\|([^\]]+?))?\]\]/g;

/** Убирает YAML-фронтматтер Obsidian (`---` … `---`) из начала файла. */
export function stripFrontmatter(source: string): string {
  if (!source.startsWith("---")) return source;

  const closing = source.indexOf("\n---", 3);
  if (closing === -1) return source;

  const lineEnd = source.indexOf("\n", closing + 1);
  return lineEnd === -1 ? "" : source.slice(lineEnd + 1).replace(/^\n+/, "");
}

/**
 * `> [!Note]` + следующий абзац → цитата с жирной подписью.
 *
 * В Obsidian тело коллаута часто пишут без `>` в начале строк — редактор всё
 * равно рисует рамку. Стандартный Markdown так не умеет, поэтому строки до
 * пустой строки переносятся внутрь цитаты.
 */
export function convertCallouts(source: string): string {
  const lines = source.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = CALLOUT_LINE.exec(lines[i]);
    if (!match) {
      out.push(lines[i]);
      continue;
    }

    const [, rawType, titleRest] = match;
    const label = CALLOUT_LABELS[rawType.toLowerCase()] ?? capitalize(rawType);
    out.push(`> **${label}**`);

    const body: string[] = [];
    if (titleRest.trim()) body.push(titleRest.trim());

    while (i + 1 < lines.length && lines[i + 1].trim() !== "") {
      i++;
      body.push(lines[i].replace(/^>\s?/, ""));
    }

    if (body.length > 0) {
      // Пустая строка цитаты, иначе подпись слипнется с текстом в один абзац.
      out.push(">");
      for (const line of body) out.push(`> ${line}`);
    }
  }

  return out.join("\n");
}

/** Имена встроенных файлов в тексте — чтобы загрузить их до конвертации. */
export function collectEmbeds(source: string): string[] {
  const names = new Set<string>();

  for (const [, target] of source.matchAll(EMBED)) {
    const name = target.split("|")[0].trim();
    if (ATTACHMENT.test(name)) names.add(name);
  }

  return [...names];
}

/**
 * Встроенные файлы `![[картинка.png]]` заменяются на разметку, которую вернул
 * `resolve` — обычно ссылку на загруженный медиаобъект. Если файла нет,
 * встраивание убирается: ссылка в никуда дала бы «битую» иконку в тексте, а
 * строка, где кроме встраивания ничего не было, исчезает целиком.
 *
 * Встраивание другой заметки (`![[Заметка]]`, без расширения) остаётся
 * вики-ссылкой — текст в ней есть, и он никуда не денется.
 */
export function replaceEmbeds(
  source: string,
  resolve: EmbedResolver = () => null
): { content: string; droppedEmbeds: string[] } {
  const droppedEmbeds: string[] = [];

  const content = source
    .split("\n")
    .map((line) => {
      if (!line.includes("![[")) return line;

      const replaced = line.replace(EMBED, (match, target: string) => {
        const name = target.split("|")[0].trim();
        if (!ATTACHMENT.test(name)) return match.slice(1);

        const markdown = resolve(name);
        if (markdown) return markdown;

        droppedEmbeds.push(name);
        return "";
      });

      return replaced.trim() === "" ? null : replaced;
    })
    .filter((line): line is string => line !== null)
    .join("\n");

  return { content, droppedEmbeds };
}

/**
 * `[[Заметка]]`, `[[Заметка#Раздел]]`, `[[Заметка|подпись]]` → обычная ссылка,
 * если такая заметка импортирована, иначе просто текст: ссылок в никуда на
 * сайте быть не должно.
 */
export function convertWikilinks(
  source: string,
  resolve: WikilinkResolver
): { content: string; unresolvedLinks: string[] } {
  const unresolvedLinks: string[] = [];

  const content = source.replace(
    WIKILINK,
    (_, rawTarget: string, _section: string | undefined, alias: string | undefined) => {
      const target = rawTarget.trim();
      const label = (alias ?? target).trim();
      const slug = resolve(target);

      if (!slug) {
        unresolvedLinks.push(target);
        return label;
      }

      return `[${label}](/notes/${slug})`;
    }
  );

  return { content, unresolvedLinks };
}

/** Значения `aliases` из фронтматтера — второе название заметки в Obsidian. */
export function readAliases(source: string): string[] {
  if (!source.startsWith("---")) return [];

  const closing = source.indexOf("\n---", 3);
  if (closing === -1) return [];

  const lines = source.slice(4, closing).split("\n");
  const start = lines.findIndex((line) => /^aliases:/.test(line));
  if (start === -1) return [];

  const inline = lines[start].slice("aliases:".length).trim();
  if (inline) {
    return inline
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((alias) => alias.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }

  const aliases: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (!item) break;
    aliases.push(item[1].trim().replace(/^["']|["']$/g, ""));
  }

  return aliases;
}

/**
 * Первый содержательный абзац без разметки — для поля `excerpt`.
 *
 * Строки, состоящие из одной ссылки, пропускаются: у оглавлений раздела первым
 * идёт список ссылок, и в аннотацию попадало бы название соседней заметки.
 */
export function excerptFrom(markdown: string, maxLength = 180): string {
  const paragraph = markdown
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        line !== "" &&
        !line.startsWith("#") &&
        !line.startsWith(">") &&
        !line.startsWith("|") &&
        !/^[-*_]{3,}$/.test(line) &&
        !/^[-*+]?\s*\[[^\]]*\]\([^)]*\)$/.test(line)
    );

  if (!paragraph) return "";

  const plain = paragraph
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;

  const cut = plain.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

export function obsidianToMarkdown(
  source: string,
  resolveLink: WikilinkResolver,
  resolveEmbed: EmbedResolver = () => null
): ConversionResult {
  const withoutFrontmatter = stripFrontmatter(source);
  const { content: withEmbeds, droppedEmbeds } = replaceEmbeds(withoutFrontmatter, resolveEmbed);
  const { content: withLinks, unresolvedLinks } = convertWikilinks(withEmbeds, resolveLink);

  return {
    content: convertCallouts(withLinks).trim(),
    droppedEmbeds,
    unresolvedLinks,
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

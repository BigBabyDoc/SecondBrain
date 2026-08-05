import { slugify } from "@/lib/slugify";

export type HeadingLevel = 1 | 2 | 3 | 4;

export type Heading = {
  /** Уровень markdown-заголовка: 1 — `#`, 2 — `##`, 3 — `###`, 4 — `####` */
  level: HeadingLevel;
  text: string;
  id: string;
};

/**
 * Цвет заголовка задаётся уровнем вложенности. Палитра — Nord, как в теме
 * «Obsidian Nord»: красный, жёлтый, зелёный и голубой на четвёртом уровне.
 * Сами цвета объявлены в globals.css.
 */
const HEADING_PALETTE: Record<HeadingLevel, { text: string; dot: string }> = {
  1: { text: "text-nord-red", dot: "bg-nord-red" },
  2: { text: "text-nord-yellow", dot: "bg-nord-yellow" },
  3: { text: "text-nord-green", dot: "bg-nord-green" },
  4: { text: "text-nord-frost", dot: "bg-nord-frost" },
};

export function headingPalette(level: HeadingLevel) {
  return HEADING_PALETTE[level];
}

/** Якорь заголовка. Индекс в конце разводит одинаковые заголовки в одной заметке. */
export function headingId(text: string, index: number): string {
  const base = slugify(text);
  return base ? `${base}-${index}` : `razdel-${index}`;
}

/**
 * Достаёт заголовки первых четырёх уровней из markdown в порядке появления.
 * Содержимое ``` -блоков пропускается: строка вида `# комментарий` внутри
 * примера кода — не заголовок.
 */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  let insideFence = false;

  markdown.split("\n").forEach((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      insideFence = !insideFence;
      return;
    }
    if (insideFence) return;

    const match = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) return;

    // Убираем разметку выделения, чтобы в оглавлении не было ** и `
    const text = match[2].replace(/[*_`]/g, "").trim();
    if (!text) return;

    headings.push({
      level: match[1].length as HeadingLevel,
      text,
      id: headingId(text, headings.length),
    });
  });

  return headings;
}

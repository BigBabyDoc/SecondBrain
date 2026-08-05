import { headingPalette, type Heading, type HeadingLevel } from "@/lib/toc";

// Отступ по уровню заголовка — показывает вложенность разделов.
const INDENT: Record<HeadingLevel, string> = {
  1: "",
  2: "",
  3: "pl-4",
  4: "pl-8",
};

export function NoteToc({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return null;

  return (
    // details/summary — раскрывающийся список без JavaScript
    <details className="group mb-8 rounded-xl border border-border bg-background-elevated/40">
      <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 text-sm font-medium marker:content-none">
        Содержание
        <span
          aria-hidden="true"
          className="text-muted transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>

      <nav aria-label="Содержание заметки" className="border-t border-border px-4 py-3">
        <ol className="space-y-1.5 text-sm">
          {headings.map((heading) => (
            <li key={heading.id} className={INDENT[heading.level]}>
              <a
                href={`#${heading.id}`}
                className="group/item flex items-baseline gap-2 text-muted hover:text-foreground"
              >
                {/* Точка того же цвета, что и заголовок в тексте */}
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-1.5 shrink-0 rounded-full ${headingPalette(heading.level).dot}`}
                />
                <span className="group-hover/item:underline">{heading.text}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}

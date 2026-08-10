import { Heading, headingPalette } from "@/lib/toc";

/**
 * Витрина закрытой заметки: из чего она состоит и с чего начинается.
 *
 * Показываются только заголовки разделов и первый абзац — то же, что автор
 * пишет в аннотации, но подробнее. Полный текст остаётся на сервере: страница
 * заметки не отдаёт `note.content` в браузер, пока проверка тарифа не пройдена.
 */
export function NotePreview({ headings, lead }: { headings: Heading[]; lead: string }) {
  if (headings.length === 0 && !lead) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-background p-5 text-left">
      {lead && (
        <p className="text-sm leading-relaxed text-muted [overflow-wrap:anywhere]">{lead}</p>
      )}

      {headings.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted">
            Что внутри
          </p>
          <ul className="mt-3 space-y-1.5">
            {headings.map((heading) => {
              const palette = headingPalette(heading.level);
              return (
                <li
                  key={heading.id}
                  className="flex items-start gap-2 text-sm"
                  // Вложенность передаётся отступом, как в оглавлении открытой заметки.
                  style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${palette.dot}`}
                  />
                  <span className="[overflow-wrap:anywhere]">{heading.text}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

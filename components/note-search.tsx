"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MIN_QUERY_LENGTH,
  groupHeadingAt,
  normalizeQuery,
  type Suggestion,
} from "@/lib/search";

/**
 * Строка поиска с подсказками. Поле остаётся обычным `input` внутри формы:
 * без JavaScript поиск по-прежнему работает отправкой формы, подсказки лишь
 * добавляются сверху.
 */
export function NoteSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = normalizeQuery(query);

    // Запрос уходит не на каждую букву, а после паузы; старый запрос
    // отменяется, иначе ответы могут прийти в другом порядке и список
    // «отстанет» от того, что уже набрано.
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (trimmed.length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        setActive(-1);
        return;
      }

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { suggestions: Suggestion[] };
        setSuggestions(data.suggestions);
        setActive(-1);
      } catch {
        // Отменённый или сорвавшийся запрос — просто оставляем прежний список.
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const visible = open && suggestions.length > 0;

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!visible) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => {
        const next = current + step;
        if (next < 0) return suggestions.length - 1;
        return next >= suggestions.length ? 0 : next;
      });
      return;
    }

    // Enter без выбранной подсказки не перехватываем: форма ищет по всему тексту.
    if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      router.push(`/notes/${suggestions[active].slug}`);
      setOpen(false);
      return;
    }

    if (event.key === "Escape") setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1">
      <input
        type="text"
        name="q"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Поиск по заметкам..."
        autoComplete="off"
        role="combobox"
        aria-expanded={visible}
        aria-controls="note-search-suggestions"
        aria-autocomplete="list"
        className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm outline-none focus:border-brand-blue"
      />

      {visible && (
        <ul
          id="note-search-suggestions"
          role="listbox"
          className="absolute z-20 mt-1 max-h-96 w-full overflow-y-auto rounded-lg border border-border bg-background-elevated py-1 shadow-xl"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.slug}>
              {groupHeadingAt(suggestions, index) && (
                <p
                  className={`px-3 pb-1 pt-2 text-[11px] uppercase tracking-wider text-muted ${
                    index > 0 ? "mt-1 border-t border-border" : ""
                  }`}
                >
                  {groupHeadingAt(suggestions, index)}
                </p>
              )}
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => {
                  router.push(`/notes/${suggestion.slug}`);
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left ${
                  index === active ? "bg-brand-blue/10" : ""
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm">{suggestion.title}</span>
                  {suggestion.tier === "PAID" && (
                    <span className="shrink-0 text-[11px] text-brand-blue">по подписке</span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {suggestion.excerpt}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

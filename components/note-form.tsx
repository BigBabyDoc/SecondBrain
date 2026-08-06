"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { NoteFormState } from "@/lib/actions/notes";

type Mode = "edit" | "preview";

const MODES: [Mode, string][] = [
  ["edit", "Редактирование"],
  ["preview", "Просмотр"],
];

/** Картинки, вставленные в текст: `![подпись](/api/media/…)`. */
const IMAGE_MARKDOWN = /!\[([^\]]*)\]\((\/api\/media\/[^)\s]+)\)/g;

const MIRRORED_STYLES = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "padding",
  "borderWidth",
  "textTransform",
] as const;

/**
 * Высота текста до указанной позиции — измеряется невидимой копией поля.
 * Ни браузер, ни арифметика по номеру строки здесь не помогают: `focus()`
 * поле не прокручивает, а строки переносятся, и «номер строки × высота»
 * промахивается тем сильнее, чем длиннее заметка.
 */
function offsetOfIndex(field: HTMLTextAreaElement, index: number): number {
  const source = getComputedStyle(field);
  const mirror = document.createElement("div");

  for (const property of MIRRORED_STYLES) mirror.style[property] = source[property];
  mirror.style.position = "absolute";
  mirror.style.top = "-9999px";
  mirror.style.width = `${field.clientWidth}px`;
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.textContent = field.value.slice(0, index);

  document.body.append(mirror);
  const offset = mirror.scrollHeight;
  mirror.remove();

  return offset;
}

type NoteFormValues = {
  title: string;
  excerpt: string;
  content: string;
  tier: "FREE" | "PAID";
  tags: string;
  published: boolean;
};

export function NoteForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (state: NoteFormState, formData: FormData) => Promise<NoteFormState>;
  defaultValues?: Partial<NoteFormValues>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<NoteFormState, FormData>(
    action,
    {}
  );
  const [content, setContent] = useState(defaultValues?.content ?? "");
  const [mode, setMode] = useState<Mode>("edit");
  const [upload, setUpload] = useState<{ busy: boolean; error?: string; note?: string }>({
    busy: false,
  });
  const contentRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Вставленные картинки видно, не выходя из редактирования: в поле ввода они
   * остаются ссылкой `![…](/api/media/…)`, а сами изображения показываются под
   * ним. Иначе, чтобы убедиться, что загрузился нужный файл, приходится
   * переключаться в «Просмотр» и обратно.
   */
  const images = useMemo(() => {
    const byUrl = new Map<string, string>();
    for (const [, alt, url] of content.matchAll(IMAGE_MARKDOWN)) byUrl.set(url, alt);
    return [...byUrl].map(([url, alt]) => ({ url, alt }));
  }, [content]);

  /**
   * Крестик убирает вставку из текста заметки. Сам файл остаётся в хранилище:
   * он адресуется по содержимому и может быть вставлен в другие заметки, так
   * что удалять его отсюда было бы опасно. Строка, где кроме картинки ничего
   * не было, уходит целиком — иначе останется пустая.
   */
  function removeImage(url: string) {
    const insert = new RegExp(
      `!\\[[^\\]]*\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`,
      "g"
    );

    setContent((prev) =>
      prev
        .split("\n")
        .map((line) => {
          if (!line.includes(url)) return line;
          const stripped = line.replace(insert, "");
          return stripped.trim() === "" ? null : stripped;
        })
        .filter((line): line is string => line !== null)
        .join("\n")
    );
  }

  /** Клик по миниатюре ставит курсор на её разметку — так проще править подпись. */
  function selectImageMarkdown(url: string) {
    const field = contentRef.current;
    if (!field) return;

    const start = content.indexOf(`](${url})`);
    if (start === -1) return;

    const opening = content.lastIndexOf("![", start);
    field.focus();
    field.setSelectionRange(opening, start + `](${url})`.length);
    field.scrollTop = Math.max(0, offsetOfIndex(field, opening) - field.clientHeight / 2);
  }

  /** Вставляет разметку в позицию курсора, а не в конец — иначе файл уезжает от места вставки. */
  function insertAtCursor(snippet: string) {
    const field = contentRef.current;
    if (!field) {
      setContent((prev) => (prev ? `${prev}\n\n${snippet}` : snippet));
      return;
    }
    const start = field.selectionStart;
    const end = field.selectionEnd;
    setContent((prev) => {
      const before = prev.slice(0, start);
      const after = prev.slice(end);
      const separator = before && !before.endsWith("\n") ? "\n\n" : "";
      return `${before}${separator}${snippet}${after}`;
    });
    requestAnimationFrame(() => {
      const caret = start + snippet.length;
      field.focus();
      field.setSelectionRange(caret, caret);
    });
  }

  async function uploadFiles(files: FileList | File[] | null) {
    if (!files?.length) return;
    setUpload({ busy: true });
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/admin/media", { method: "POST", body });
        const result = await response.json();
        if (!response.ok) {
          setUpload({ busy: false, error: result.error ?? "Не удалось загрузить файл" });
          return;
        }
        insertAtCursor(result.markdown);
        setUpload({
          busy: false,
          note: result.deduplicated
            ? `${file.name}: такой файл уже был загружен, вставлена ссылка на него`
            : `${file.name} загружен`,
        });
      }
    } catch {
      setUpload({ busy: false, error: "Сеть недоступна — файл не загружен" });
    }
  }

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <div>
        <label className="block text-sm text-muted">Заголовок</label>
        <input
          name="title"
          defaultValue={defaultValues?.title}
          required
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand-blue"
        />
      </div>

      <div>
        <label className="block text-sm text-muted">Краткое описание (excerpt)</label>
        <textarea
          name="excerpt"
          defaultValue={defaultValues?.excerpt}
          required
          rows={2}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand-blue"
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="block text-sm text-muted">
            Текст заметки{" "}
            <span className="text-xs">
              (markdown: **жирный**, - список, | таблицы |. Заголовки # ## ### #### —
              из них собирается «Содержание», цвет зависит от уровня)
            </span>
          </label>
          <div className="flex gap-1 rounded-full border border-border p-0.5 text-xs">
            {MODES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={
                  mode === value
                    ? "rounded-full bg-brand-blue px-3 py-1 font-medium text-[#0a1220]"
                    : "rounded-full px-3 py-1 text-muted hover:text-foreground"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Поле остаётся в DOM и в режиме просмотра — иначе content не уйдёт в форму. */}
        <div className={mode === "edit" ? "" : "hidden"}>
          <textarea
            ref={contentRef}
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onDrop={(e) => {
              if (!e.dataTransfer.files.length) return;
              e.preventDefault();
              void uploadFiles(e.dataTransfer.files);
            }}
            onPaste={(e) => {
              // Скриншот из буфера — самый частый способ добавить картинку.
              const files = Array.from(e.clipboardData.files);
              if (files.length === 0) return;
              e.preventDefault();
              void uploadFiles(files);
            }}
            required
            rows={14}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-brand-blue"
          />

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            <label className="cursor-pointer rounded-full border border-border px-3 py-1.5 hover:border-brand-blue hover:text-brand-blue">
              {upload.busy ? "Загружаем..." : "Добавить файл"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                multiple
                disabled={upload.busy}
                onChange={(e) => {
                  void uploadFiles(e.target.files);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
            <span>
              PNG, JPEG, WebP, GIF, PDF — до 10 МБ. Файл можно перетащить в поле или
              вставить из буфера.
            </span>
          </div>

          {upload.error && <p className="mt-2 text-sm text-red-400">{upload.error}</p>}
          {upload.note && !upload.error && (
            <p className="mt-2 text-sm text-brand-green">{upload.note}</p>
          )}

          {images.length > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-background-elevated/40 p-3">
              <p className="text-xs text-muted">
                Вложения в тексте ({images.length}) — нажмите, чтобы выделить разметку
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {images.map((image) => (
                  <div key={image.url} className="relative w-32">
                    <button
                      type="button"
                      onClick={() => selectImageMarkdown(image.url)}
                      title={image.alt || image.url}
                      className="block w-full overflow-hidden rounded-lg border border-border text-left hover:border-brand-blue"
                    >
                      {/* Обычный img: файлы отдаёт наш /api/media, оптимизатор Next тут не нужен. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.alt}
                        className="h-24 w-full bg-background object-contain"
                      />
                      <span className="block truncate px-2 py-1 text-[11px] text-muted">
                        {image.alt || "без подписи"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(image.url)}
                      title="Убрать из текста заметки"
                      aria-label={`Убрать «${image.alt || "изображение"}» из текста`}
                      className="absolute right-1 top-1 rounded-full border border-border bg-background/90 px-1.5 pb-0.5 text-sm leading-none text-muted hover:border-red-400 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {mode === "preview" && (
          <div className="mt-1 min-h-[22rem] rounded-lg border border-border bg-background px-4 py-3">
            {content.trim() ? (
              <Markdown>{content}</Markdown>
            ) : (
              <p className="text-sm text-muted">
                Пока пусто — переключитесь на «Редактирование» и наберите текст.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-muted">Тариф доступа</label>
          <select
            name="tier"
            defaultValue={defaultValues?.tier ?? "FREE"}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand-blue"
          >
            <option value="FREE">Бесплатно</option>
            <option value="PAID">Полный доступ</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted">Теги (через запятую)</label>
          <input
            name="tags"
            defaultValue={defaultValues?.tags}
            placeholder="лихорадка, дозировки"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand-blue"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="published"
          defaultChecked={defaultValues?.published ?? true}
        />
        Опубликовано
      </label>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-medium text-[#0a1220] hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Сохраняем..." : submitLabel}
      </button>
    </form>
  );
}

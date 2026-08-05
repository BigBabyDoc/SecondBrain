"use client";

import { useActionState, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { NoteFormState } from "@/lib/actions/notes";

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
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [upload, setUpload] = useState<{ busy: boolean; error?: string; note?: string }>({
    busy: false,
  });
  const contentRef = useRef<HTMLTextAreaElement>(null);

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

  async function uploadFiles(files: FileList | null) {
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
            {(
              [
                ["edit", "Редактирование"],
                ["preview", "Просмотр"],
              ] as const
            ).map(([value, label]) => (
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
            <span>PNG, JPEG, WebP, GIF, PDF — до 10 МБ. Можно перетащить файл в поле.</span>
          </div>

          {upload.error && <p className="mt-2 text-sm text-red-400">{upload.error}</p>}
          {upload.note && !upload.error && (
            <p className="mt-2 text-sm text-brand-green">{upload.note}</p>
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

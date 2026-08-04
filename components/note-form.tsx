"use client";

import { useActionState } from "react";
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
        <label className="block text-sm text-muted">
          Текст заметки{" "}
          <span className="text-xs">
            (markdown: **жирный**, ## заголовок, - список, | таблицы |)
          </span>
        </label>
        <textarea
          name="content"
          defaultValue={defaultValues?.content}
          required
          rows={14}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-brand-blue"
        />
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

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NoteForm } from "@/components/note-form";
import { updateNoteAction, deleteNoteAction } from "@/lib/actions/notes";

export default async function EditNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) notFound();

  const boundUpdate = updateNoteAction.bind(null, note.id);
  const boundDelete = deleteNoteAction.bind(null, note.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Редактирование заметки</h1>
        <form action={boundDelete}>
          <button
            type="submit"
            className="rounded-full border border-red-400/40 px-4 py-1.5 text-sm text-red-400 hover:bg-red-400/10"
          >
            Удалить
          </button>
        </form>
      </div>

      <NoteForm
        action={boundUpdate}
        submitLabel="Сохранить"
        defaultValues={{
          title: note.title,
          excerpt: note.excerpt,
          content: note.content,
          tier: note.tier as "FREE" | "PAID",
          tags: note.tags.join(", "),
          published: note.published,
        }}
      />
    </div>
  );
}

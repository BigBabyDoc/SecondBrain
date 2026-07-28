import { NoteForm } from "@/components/note-form";
import { createNoteAction } from "@/lib/actions/notes";

export default function NewNotePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Новая заметка</h1>
      <NoteForm action={createNoteAction} submitLabel="Создать" />
    </div>
  );
}

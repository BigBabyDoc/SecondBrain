import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TIER_LABELS, TierName } from "@/lib/access";

export default async function AdminNotesPage() {
  const notes = await prisma.note.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Заметки — админка</h1>
        <Link
          href="/admin/notes/new"
          className="rounded-full bg-brand-green px-5 py-2 text-sm font-medium text-[#0a1220] hover:opacity-90"
        >
          + Новая заметка
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-background-elevated text-left text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Заголовок</th>
              <th className="px-4 py-2 font-medium">Тариф</th>
              <th className="px-4 py-2 font-medium">Статус</th>
              <th className="px-4 py-2 font-medium">Обновлена</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {notes.map((note) => (
              <tr key={note.id} className="border-t border-border">
                <td className="px-4 py-2">{note.title}</td>
                <td className="px-4 py-2">{TIER_LABELS[note.tier as TierName]}</td>
                <td className="px-4 py-2">
                  {note.published ? (
                    <span className="text-brand-green">опубликована</span>
                  ) : (
                    <span className="text-muted">черновик</span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted">
                  {new Date(note.updatedAt).toLocaleDateString("ru-RU")}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/notes/${note.id}/edit`}
                    className="text-brand-blue hover:underline"
                  >
                    Редактировать
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {notes.length === 0 && (
        <p className="mt-8 text-center text-muted">Заметок пока нет.</p>
      )}
    </div>
  );
}

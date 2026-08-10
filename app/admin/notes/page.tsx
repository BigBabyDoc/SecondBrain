import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TIER_LABELS, TierName } from "@/lib/access";
import { AdminNav } from "@/components/admin-nav";
import { VIEWS, plural } from "@/lib/plural";

/** Сортировки списка. Ключи попадают в адрес, поэтому проверяются явно. */
const ORDERS = {
  new: { label: "Сначала новые", orderBy: { createdAt: "desc" } },
  views: { label: "По просмотрам", orderBy: { views: "desc" } },
} as const;

type OrderKey = keyof typeof ORDERS;

export default async function AdminNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  // proxy.ts закрывает /admin по роли, но страница обязана проверить сама:
  // серверный компонент достижим и в обход маршрутизации (RSC-запрос).
  const session = await auth();
  if (session?.user.role !== "ADMIN") notFound();

  const params = await searchParams;
  const sort: OrderKey = params.sort === "views" ? "views" : "new";
  const notes = await prisma.note.findMany({ orderBy: ORDERS[sort].orderBy });

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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <AdminNav current="/admin/notes" />
        <div className="flex gap-2 text-sm">
          {(Object.keys(ORDERS) as OrderKey[]).map((key) => (
            <Link
              key={key}
              href={key === "new" ? "/admin/notes" : `/admin/notes?sort=${key}`}
              aria-current={key === sort ? "true" : undefined}
              className={
                key === sort
                  ? "rounded-full border border-brand-blue px-4 py-2 text-brand-blue"
                  : "rounded-full border border-border px-4 py-2 text-muted hover:border-brand-blue hover:text-brand-blue"
              }
            >
              {ORDERS[key].label}
            </Link>
          ))}
        </div>
      </div>

      {/* На телефоне шесть колонок за экран не помещаются, и просмотры со
          ссылкой на правку оказываются в невидимой части таблицы. До sm —
          карточки с теми же данными. */}
      <ul className="mt-6 space-y-3 sm:hidden">
        {notes.map((note) => (
          <li
            key={note.id}
            className="rounded-xl border border-border bg-background-elevated p-4 text-sm"
          >
            <p className="font-medium [overflow-wrap:anywhere]">{note.title}</p>
            <p className="mt-2 text-xs text-muted">
              {TIER_LABELS[note.tier as TierName]} ·{" "}
              {note.published ? (
                <span className="text-brand-green">опубликована</span>
              ) : (
                "черновик"
              )}{" "}
              · {note.views} {plural(note.views, VIEWS)} ·{" "}
              {new Date(note.updatedAt).toLocaleDateString("ru-RU")}
            </p>
            <Link
              href={`/admin/notes/${note.id}/edit`}
              className="mt-2 inline-block py-2 text-brand-blue hover:underline"
            >
              Редактировать
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="bg-background-elevated text-left text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Заголовок</th>
              <th className="px-4 py-2 font-medium">Тариф</th>
              <th className="px-4 py-2 font-medium">Статус</th>
              <th className="px-4 py-2 font-medium">Просмотры</th>
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
                <td className="px-4 py-2 tabular-nums">{note.views}</td>
                <td className="px-4 py-2 text-muted">
                  {new Date(note.updatedAt).toLocaleDateString("ru-RU")}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/notes/${note.id}/edit`}
                    className="-my-2 inline-block py-2 text-brand-blue hover:underline"
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

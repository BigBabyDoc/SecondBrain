import Link from "next/link";

export const metadata = {
  title: "Страница не найдена — Второй мозг педиатра",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-5xl font-bold text-brand-blue">404</p>
      <h1 className="mt-4 text-2xl font-bold">Страница не найдена</h1>
      <p className="mt-3 text-muted">
        Похоже, заметку удалили или ссылка была неверной. Попробуйте найти нужное в каталоге.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/notes"
          className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-medium text-[#0a1220] hover:opacity-90"
        >
          Смотреть заметки
        </Link>
        <Link
          href="/"
          className="rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:border-brand-blue hover:text-brand-blue"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}

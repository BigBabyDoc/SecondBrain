import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center sm:px-6">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">Второй мозг педиатра</p>
          <span
            title="Информационная продукция 18+"
            className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted"
          >
            18+
          </span>
        </div>
        <p>Быстро. Удобно. Достоверно.</p>
        <p className="text-xs">
          © {new Date().getFullYear()} Второй мозг педиатра. Материалы носят справочный характер
          и не заменяют консультацию врача.
        </p>
        <p className="text-xs">
          Кузнецов Валерий Каренович (самозанятый), ИНН 231714600779. Email:{" "}
          Valeriy_Kuznetsov_02@mail.ru
        </p>
        <div className="flex gap-4 text-xs">
          <Link href="/oferta" className="hover:text-foreground hover:underline">
            Публичная оферта
          </Link>
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            Политика конфиденциальности
          </Link>
        </div>
      </div>
    </footer>
  );
}

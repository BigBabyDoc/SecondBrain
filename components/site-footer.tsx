export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center sm:px-6">
        <p className="font-medium text-foreground">Второй мозг педиатра</p>
        <p>Быстро. Удобно. Достоверно.</p>
        <p className="text-xs">
          © {new Date().getFullYear()} Второй мозг педиатра. Материалы носят справочный характер
          и не заменяют консультацию врача.
        </p>
      </div>
    </footer>
  );
}

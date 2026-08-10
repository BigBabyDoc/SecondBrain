import Link from "next/link";

const TABS = [
  { href: "/admin/notes", label: "Заметки" },
  { href: "/admin/payments", label: "Платежи" },
];

/** Переключение между разделами админки. `current` подсвечивает активный. */
export function AdminNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === current ? "page" : undefined}
          className={
            tab.href === current
              ? "rounded-full bg-brand-blue px-4 py-2 font-medium text-[#0a1220]"
              : "rounded-full border border-border px-4 py-2 text-muted hover:border-brand-blue hover:text-brand-blue"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

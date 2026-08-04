"use client";

import Link from "next/link";
import { useState } from "react";

export type MobileNavLink = { href: string; label: string };

export function MobileNav({ links }: { links: MobileNavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Закрыть меню" : "Открыть меню"}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:border-brand-blue hover:text-brand-blue"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          {open ? "✕" : "☰"}
        </span>
      </button>

      {open && (
        <nav
          id="mobile-nav"
          className="absolute left-0 right-0 top-full z-20 border-b border-border bg-background-elevated px-4 py-3 shadow-lg"
        >
          <ul className="flex flex-col gap-1 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  // Переход не размонтирует шапку, поэтому меню закрываем сами.
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-muted hover:bg-background hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

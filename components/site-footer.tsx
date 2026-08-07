import Link from "next/link";
import { CONTACT_EMAIL, socialLinks } from "@/lib/social";
import { CookieSettingsLink } from "@/components/cookie-settings-link";
import { LEGAL_DOCUMENTS, OPERATOR } from "@/lib/legal";

const LEGAL_LINKS = [
  LEGAL_DOCUMENTS.terms,
  LEGAL_DOCUMENTS.offer,
  LEGAL_DOCUMENTS.privacy,
  LEGAL_DOCUMENTS.cookies,
  LEGAL_DOCUMENTS.consents,
];

const ICONS: Record<string, React.ReactNode> = {
  Telegram: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
      <path d="M21.8 3.3 2.9 10.6c-1.1.4-1.1 1.1-.2 1.4l4.8 1.5 1.9 5.7c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.5c.3-1.2-.5-1.8-1.2-1.5zM7.9 13.1l10.2-6.4c.5-.3.9-.1.6.2l-8.7 7.9-.3 3.6-1.8-5.3z" />
    </svg>
  ),
  ВКонтакте: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
      <path d="M12.8 16.9c-5.4 0-8.7-3.8-8.8-10h2.7c.1 4.6 2.2 6.5 3.8 6.9V6.9h2.6v3.9c1.6-.2 3.3-2 3.9-3.9h2.5c-.4 2.3-2.1 4.1-3.3 4.9 1.2.6 3.1 2.2 3.9 5.1h-2.8c-.6-1.9-2.1-3.3-4.2-3.6v3.6h-.3z" />
    </svg>
  ),
};

export function SiteFooter() {
  const socials = socialLinks();

  return (
    <footer className="border-t border-border py-8 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center sm:px-6">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">Второй мозг педиатра</p>
          <span
            title="Информационная продукция 18+"
            className="rounded border border-border px-1.5 py-0.5 text-[0.625rem] font-semibold text-muted"
          >
            18+
          </span>
        </div>
        <p>Быстро. Удобно. Достоверно.</p>

        <section className="mt-4 flex flex-col items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">
            Контакты
          </h2>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-block py-2 text-xs hover:text-foreground hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          {socials.length > 0 && (
            <div className="mt-1 flex flex-wrap justify-center gap-3">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs hover:border-brand-blue hover:text-brand-blue"
                >
                  {ICONS[social.name]}
                  {social.name}
                </a>
              ))}
            </div>
          )}
        </section>

        <p className="mt-4 text-xs">
          © {new Date().getFullYear()} Второй мозг педиатра. Материалы носят справочный характер
          и не заменяют консультацию врача.
        </p>
        <p className="text-xs">
          {OPERATOR.fullName} (самозанятый), ИНН {OPERATOR.inn}.
        </p>
        {/* Вертикальные отступы у ссылок, а не gap-y: на телефоне строка текста
            в 16 px — слишком мелкая цель для пальца, а padding и разводит
            строки, и увеличивает область нажатия одновременно. */}
        <div className="flex flex-wrap justify-center gap-x-4 text-xs">
          <Link href="/faq" className="inline-block py-2 hover:text-foreground hover:underline">
            Вопросы и ответы
          </Link>
          {LEGAL_LINKS.map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              className="inline-block py-2 hover:text-foreground hover:underline"
            >
              {doc.shortTitle}
            </Link>
          ))}
          {/* Требование Политики cookie: изменить выбор можно с любой страницы. */}
          <CookieSettingsLink />
        </div>
      </div>
    </footer>
  );
}

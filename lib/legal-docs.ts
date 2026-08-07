import { readFile } from "fs/promises";
import path from "path";
import {
  AUTO_RENEWAL_ENABLED,
  LEGAL_DOCUMENTS,
  OPERATOR,
  type LegalDocumentKey,
  siteUrl,
} from "@/lib/legal";

/** Имена файлов в content/legal — намеренно не совпадают с ключами документов. */
const FILES: Record<LegalDocumentKey, string> = {
  terms: "terms.md",
  offer: "oferta.md",
  privacy: "privacy.md",
  cookies: "cookies.md",
  consents: "consents.md",
};

const AUTO_RENEWAL_NOTICE =
  "> **Раздел не применяется.** Автоматическое продление подписки в настоящее время " +
  "не подключено: сервис не сохраняет платёжное средство для последующих списаний и " +
  "не производит автоматических платежей. Продление подписки возможно только путём " +
  "самостоятельной оплаты Пользователем. Условия настоящего раздела вступят в силу " +
  "с момента запуска функции автопродления, о чём Пользователи будут уведомлены " +
  "в порядке, предусмотренном настоящим документом.";

/** Незаполненный реквизит виден в тексте, а не молча исчезает. */
function orPlaceholder(value: string, label: string): string {
  return value.trim() || `«${label} — не указан»`;
}

function substitute(markdown: string): string {
  const replacements: Record<string, string> = {
    "{{SITE_URL}}": siteUrl(),
    "{{POSTAL_ADDRESS}}": orPlaceholder(OPERATOR.postalAddress, "адрес для корреспонденции"),
    "{{REVISION_DATE}}": orPlaceholder(
      LEGAL_DOCUMENTS.terms.revisedAt,
      "дата редакции"
    ),
    "{{AUTO_RENEWAL_NOTICE}}": AUTO_RENEWAL_ENABLED ? "" : AUTO_RENEWAL_NOTICE,
  };

  return Object.entries(replacements).reduce(
    (text, [token, value]) => text.replaceAll(token, value),
    markdown
  );
}

/**
 * Читает текст документа с диска. Файлы включаются в standalone-сборку через
 * outputFileTracingIncludes в next.config.ts — без этого трассировщик их
 * не находит, потому что путь собирается во время выполнения.
 */
export async function loadLegalDocument(key: LegalDocumentKey): Promise<string> {
  const file = path.join(process.cwd(), "content", "legal", FILES[key]);
  const raw = await readFile(file, "utf8");

  // Заголовок первого уровня выводится страницей отдельно, чтобы на странице
  // не было двух h1 подряд.
  const withoutTitle = raw.replace(/^#\s+.+\n/, "");

  return substitute(withoutTitle);
}

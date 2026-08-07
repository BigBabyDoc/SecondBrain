import { Markdown } from "@/components/markdown";
import { NoteToc } from "@/components/note-toc";
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from "@/lib/legal";
import { loadLegalDocument } from "@/lib/legal-docs";
import { extractHeadings } from "@/lib/toc";

/** Документы длинные, поэтому оглавление показываем начиная с нескольких разделов. */
const MIN_HEADINGS_FOR_TOC = 3;

export async function LegalPage({ document }: { document: LegalDocumentKey }) {
  const meta = LEGAL_DOCUMENTS[document];
  const markdown = await loadLegalDocument(document);
  const headings = extractHeadings(markdown);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">{meta.title}</h1>
      <p className="mt-2 text-sm text-muted">Сайт «Второй мозг педиатра»</p>

      <div className="mt-8">
        {headings.length >= MIN_HEADINGS_FOR_TOC && <NoteToc headings={headings} />}
        <Markdown headings={headings} variant="legal">
          {markdown}
        </Markdown>
      </div>
    </div>
  );
}

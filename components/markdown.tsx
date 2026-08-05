import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { headingPalette, type Heading } from "@/lib/toc";

// scroll-mt нужен, чтобы при переходе по якорю заголовок не прилипал
// вплотную к верхней границе окна.
const HEADING_BASE = "scroll-mt-24 first:mt-0";

export function Markdown({
  children,
  headings = [],
}: {
  children: string;
  headings?: Heading[];
}) {
  // Заголовки рендерятся в том же порядке, в каком их нашёл extractHeadings,
  // поэтому якоря раздаются по счётчику — это гарантирует совпадение
  // ссылок в оглавлении и id на странице даже при одинаковых названиях.
  let cursor = 0;
  const nextId = () => headings[cursor++]?.id;

  // Плагин typography не подключён, поэтому стили задаём поэлементно —
  // так же контролируем, что HTML из markdown не рендерится (по умолчанию
  // react-markdown его экранирует).
  const components: Components = {
    // `#` внутри заметки опускаем до h2: единственный h1 на странице — её заголовок.
    h1: ({ children }) => (
      <h2
        id={nextId()}
        className={`mt-8 text-2xl font-bold ${headingPalette(1).text} ${HEADING_BASE}`}
      >
        {children}
      </h2>
    ),
    h2: ({ children }) => (
      <h2
        id={nextId()}
        className={`mt-8 text-xl font-semibold ${headingPalette(2).text} ${HEADING_BASE}`}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        id={nextId()}
        className={`mt-6 text-lg font-semibold ${headingPalette(3).text} ${HEADING_BASE}`}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        id={nextId()}
        className={`mt-5 text-base font-semibold ${headingPalette(4).text} ${HEADING_BASE}`}
      >
        {children}
      </h4>
    ),
    p: (props) => <p className="mt-4 first:mt-0" {...props} />,
    ul: (props) => <ul className="mt-4 list-disc space-y-1 pl-6" {...props} />,
    ol: (props) => <ol className="mt-4 list-decimal space-y-1 pl-6" {...props} />,
    li: (props) => <li className="pl-1" {...props} />,
    strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
    blockquote: (props) => (
      <blockquote
        className="mt-4 border-l-2 border-brand-blue/60 pl-4 italic text-muted"
        {...props}
      />
    ),
    a: (props) => (
      <a className="text-brand-blue hover:underline" rel="noopener noreferrer" {...props} />
    ),
    code: (props) => (
      <code
        className="rounded bg-background-elevated px-1.5 py-0.5 font-mono text-[13px]"
        {...props}
      />
    ),
    pre: (props) => (
      <pre
        className="mt-4 overflow-x-auto rounded-lg border border-border bg-background-elevated p-4 text-[13px]"
        {...props}
      />
    ),
    hr: () => <hr className="mt-8 border-border" />,
    table: (props) => (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm" {...props} />
      </div>
    ),
    th: (props) => (
      <th
        className="border border-border bg-background-elevated px-3 py-2 text-left font-medium"
        {...props}
      />
    ),
    td: (props) => <td className="border border-border px-3 py-2 align-top" {...props} />,
  };

  return (
    <div className="leading-relaxed text-[15px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

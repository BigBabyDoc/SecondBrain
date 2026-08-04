import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Плагин typography не подключён, поэтому стили задаём поэлементно —
// так же контролируем, что HTML из markdown не рендерится (по умолчанию
// react-markdown его экранирует).
const components: Components = {
  h1: (props) => <h2 className="mt-8 text-2xl font-bold first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-8 text-xl font-semibold first:mt-0" {...props} />,
  h3: (props) => <h3 className="mt-6 text-lg font-semibold first:mt-0" {...props} />,
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
    <code className="rounded bg-background-elevated px-1.5 py-0.5 font-mono text-[13px]" {...props} />
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
    <th className="border border-border bg-background-elevated px-3 py-2 text-left font-medium" {...props} />
  ),
  td: (props) => <td className="border border-border px-3 py-2 align-top" {...props} />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="leading-relaxed text-[15px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

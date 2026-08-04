import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Плагин typography не подключён, поэтому стили задаём поэлементно —
// так же контролируем, что HTML из markdown не рендерится (по умолчанию
// react-markdown его экранирует).
//
// Пропсы не разворачиваются целиком: react-markdown передаёт служебный node
// с узлом AST, и при спреде он утекает в DOM как node="[object Object]".
// Пробрасываем только то, что действительно нужно разметке.
const components: Components = {
  h1: ({ children }) => <h2 className="mt-8 text-2xl font-bold first:mt-0">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-8 text-xl font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-6 text-lg font-semibold first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="mt-4 first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-1 pl-6">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-2 border-brand-blue/60 pl-4 italic text-muted">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} rel="noopener noreferrer" className="text-brand-blue hover:underline">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-background-elevated px-1.5 py-0.5 font-mono text-[13px]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-background-elevated p-4 text-[13px]">
      {children}
    </pre>
  ),
  hr: () => <hr className="mt-8 border-border" />,
  // Картинки приходят из /api/media, их размеры заранее неизвестны —
  // обычный img с ограничением по ширине, без next/image.
  img: ({ src, alt, title }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === "string" ? src : undefined}
      alt={alt ?? ""}
      title={title}
      loading="lazy"
      className="mt-4 h-auto max-w-full rounded-lg border border-border"
    />
  ),
  table: ({ children }) => (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  // style сохраняем: в GFM-таблицах через него задаётся выравнивание колонок.
  th: ({ children, style }) => (
    <th
      style={style}
      className="border border-border bg-background-elevated px-3 py-2 text-left font-medium"
    >
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="border border-border px-3 py-2 align-top">
      {children}
    </td>
  ),
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

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugify } from "@/lib/content/lessons";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) return textOf((node.props as { children?: ReactNode }).children);
  return "";
}

const components: Components = {
  h2: ({ children }) => (
    <h2
      id={slugify(textOf(children))}
      className="mt-14 mb-4 scroll-mt-24 text-[1.35rem] font-semibold tracking-tight text-ink-100 first:mt-0"
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className="mt-8 mb-3 font-medium text-ink-100">{children}</h3>,
  p: ({ children }) => <p className="my-4 text-[15.5px] leading-7 text-ink-300">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink-100">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-ink-100 underline decoration-ink-500 underline-offset-[3px] transition-colors hover:decoration-neon-400"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-1.5 pl-5 text-[15.5px] leading-7 text-ink-300 marker:text-ink-500">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-1.5 pl-5 text-[15.5px] leading-7 text-ink-300 marker:text-ink-500">{children}</ol>
  ),
  blockquote: ({ children }) => (
    <aside className="my-6 flex gap-3 rounded-lg border-l-2 border-neon-400 bg-ink-850 px-4 py-1">
      <Info className="mt-[15px] h-4 w-4 shrink-0 text-neon-400" aria-hidden />
      <div className="[&_p]:my-3 [&_p]:text-sm [&_p]:leading-6 [&_p]:text-ink-300">{children}</div>
    </aside>
  ),
  pre: ({ children }) => (
    <pre className="my-5 overflow-x-auto rounded-lg border border-ink-800 bg-ink-950 px-5 py-4 font-mono text-[13px] leading-relaxed text-ink-200">
      {children}
    </pre>
  ),
  code: ({ className, children }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded-md bg-ink-800 px-1.5 py-0.5 font-mono text-[0.85em] text-ink-100">{children}</code>
    ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-ink-800">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-ink-850 text-xs text-ink-400">{children}</thead>,
  th: ({ children }) => <th className="px-4 py-2.5 font-medium">{children}</th>,
  td: ({ children }) => <td className="border-t border-ink-800 px-4 py-2.5 align-top text-ink-300">{children}</td>,
};

export function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {source}
    </ReactMarkdown>
  );
}

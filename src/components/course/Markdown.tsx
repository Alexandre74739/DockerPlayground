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
    <h2 id={slugify(textOf(children))} className="mt-12 mb-4 scroll-mt-24 text-xl font-semibold tracking-tight text-white first:mt-0">
      <span className="mr-2 font-mono text-neon-400">#</span>
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className="mt-8 mb-3 font-semibold text-ink-100">{children}</h3>,
  p: ({ children }) => <p className="my-4 leading-7 text-ink-300">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-azure-400 underline decoration-azure-400/40 underline-offset-2 hover:decoration-azure-400"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="my-4 list-disc space-y-1.5 pl-6 leading-7 text-ink-300 marker:text-neon-400">{children}</ul>,
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-1.5 pl-6 leading-7 text-ink-300 marker:font-mono marker:text-azure-400">{children}</ol>
  ),
  blockquote: ({ children }) => (
    <aside className="my-6 flex gap-3 rounded-xl border border-azure-500/30 bg-azure-950/60 px-4 py-1 text-sm">
      <Info className="mt-4 h-4 w-4 shrink-0 text-azure-400" aria-hidden />
      <div className="[&_p]:my-3 [&_p]:text-ink-200">{children}</div>
    </aside>
  ),
  pre: ({ children }) => (
    <pre className="my-5 overflow-x-auto rounded-xl border border-ink-700 bg-ink-950 p-4 font-mono text-[13px] leading-relaxed text-ink-100">
      {children}
    </pre>
  ),
  code: ({ className, children }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded bg-ink-700/70 px-1.5 py-0.5 font-mono text-[0.86em] text-azure-200">{children}</code>
    ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-ink-700">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-ink-800 font-mono text-xs uppercase tracking-wider text-ink-400">{children}</thead>,
  th: ({ children }) => <th className="px-4 py-2.5 font-medium">{children}</th>,
  td: ({ children }) => <td className="border-t border-ink-700 px-4 py-2.5 align-top text-ink-300">{children}</td>,
};

export function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {source}
    </ReactMarkdown>
  );
}

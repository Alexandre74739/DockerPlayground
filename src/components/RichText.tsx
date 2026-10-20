/**
 * Rendu minimal de texte enrichi : `code` et **gras**.
 * Suffisant pour les consignes courtes ; les cours utilisent le rendu Markdown.
 */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={index} className="rounded-md bg-ink-800 px-1.5 py-0.5 font-mono text-[0.85em] text-ink-100">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-semibold text-ink-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}

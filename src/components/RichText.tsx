/**
 * Rendu minimal de texte enrichi : `code` et **gras**.
 * Suffisant pour les consignes, sans dépendance markdown.
 */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={index} className="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[0.9em] text-brand-800">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </>
  );
}

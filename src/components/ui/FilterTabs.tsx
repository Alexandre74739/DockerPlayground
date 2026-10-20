"use client";

export type CompletionFilter = "all" | "todo" | "done";

type FilterTabsProps = {
  value: CompletionFilter;
  onChange: (value: CompletionFilter) => void;
  /** Libellé du premier onglet, ex. « Tous les modules ». */
  allLabel: string;
  label: string;
};

/** Filtre d'avancement : tout / à terminer / terminés. */
export function FilterTabs({ value, onChange, allLabel, label }: FilterTabsProps) {
  const options: { id: CompletionFilter; label: string }[] = [
    { id: "all", label: allLabel },
    { id: "todo", label: "À terminer" },
    { id: "done", label: "Terminés" },
  ];
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-ink-800 bg-ink-850 p-1" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${value === option.id ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-100"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function matchesFilter(filter: CompletionFilter, done: boolean): boolean {
  return filter === "all" || (filter === "done") === done;
}

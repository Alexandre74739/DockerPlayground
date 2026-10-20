"use client";

import { FilePlus2, FileText, Folder } from "lucide-react";
import { type FormEvent, useState } from "react";

type FileExplorerProps = {
  /** Chemins relatifs au dossier du projet. */
  files: string[];
  selected: string | null;
  onSelect: (path: string) => void;
  onCreate: (path: string) => void;
};

/** Arborescence simple des fichiers du projet, avec création de fichier. */
export function FileExplorer({ files, selected, onSelect, onCreate }: FileExplorerProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const folders = [
    ...new Set(
      files.flatMap((file) =>
        file
          .split("/")
          .slice(0, -1)
          .map((_, index, parts) => parts.slice(0, index + 1).join("/")),
      ),
    ),
  ];
  const entries = [...folders.map((path) => ({ path, folder: true })), ...files.map((path) => ({ path, folder: false }))].sort((a, b) => {
    const [pa, pb] = [a.path.split("/"), b.path.split("/")];
    for (let index = 0; index < Math.min(pa.length, pb.length); index++) {
      if (pa[index] !== pb[index]) {
        const aIsDir = index < pa.length - 1 || a.folder;
        const bIsDir = index < pb.length - 1 || b.folder;
        if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
        return pa[index].localeCompare(pb[index]);
      }
    }
    return pa.length - pb.length;
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const path = name.trim().replace(/^\.?\//, "");
    if (path) onCreate(path);
    setName("");
    setCreating(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-ink-800 pl-3 pr-1.5">
        <span className="text-xs font-medium text-ink-400">~/projet</span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded p-1.5 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-100"
          aria-label="Nouveau fichier"
          title="Nouveau fichier"
        >
          <FilePlus2 className="h-4 w-4" />
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto py-1.5 text-[13px]">
        {creating && (
          <li className="px-2 pb-1">
            <form onSubmit={submit}>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => setCreating(false)}
                onKeyDown={(event) => event.key === "Escape" && setCreating(false)}
                placeholder="nom du fichier"
                className="w-full rounded border border-ink-600 bg-ink-950 px-2 py-1 font-mono text-xs text-ink-100 outline-none focus:border-neon-400"
              />
            </form>
          </li>
        )}
        {entries.map(({ path, folder }) => {
          const depth = path.split("/").length - 1;
          const label = path.split("/").pop();
          const Icon = folder ? Folder : FileText;
          return (
            <li key={`${folder ? "d" : "f"}:${path}`}>
              {folder ? (
                <span className="flex items-center gap-1.5 py-1 text-ink-500" style={{ paddingLeft: 12 + depth * 14 }}>
                  <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(path)}
                  className={`flex w-full items-center gap-1.5 py-1 text-left font-mono transition-colors ${
                    selected === path ? "bg-ink-800 text-ink-100" : "text-ink-400 hover:bg-ink-850 hover:text-ink-100"
                  }`}
                  style={{ paddingLeft: 12 + depth * 14 }}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="truncate">{label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

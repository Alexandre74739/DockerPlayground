import { readFileSync } from "node:fs";
import path from "node:path";
import { slugify } from "../slugify";

/** Cours écrits, un fichier Markdown par module (lus au build, côté serveur). */

const LESSONS_DIR = path.join(process.cwd(), "src/lib/content/lessons");

export function getLesson(moduleId: string): string {
  return readFileSync(path.join(LESSONS_DIR, `${moduleId}.md`), "utf8");
}

/** Titres de niveau 2, pour le sommaire. */
export function lessonOutline(markdown: string): { id: string; title: string }[] {
  return [...markdown.matchAll(/^## (.+)$/gm)].map((match) => ({ id: slugify(match[1]), title: match[1].replace(/`/g, "") }));
}

export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.round(markdown.split(/\s+/).length / 200));
}

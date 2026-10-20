/** Utilitaires de mise en forme imitant la sortie de la CLI Docker. */

export function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => (row[index] ?? "").length)));
  const line = (cells: string[]) =>
    cells
      .map((cell, index) => (index === cells.length - 1 ? cell : cell.padEnd(widths[index] + 3)))
      .join("")
      .trimEnd();
  return [line(headers), ...rows.map(line)].join("\n");
}

/** Équivalent de units.HumanDuration de Docker. */
export function humanDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 1) return "Less than a second";
  if (seconds === 1) return "1 second";
  if (seconds < 60) return `${seconds} seconds`;
  if (minutes === 1) return "About a minute";
  if (minutes < 60) return `${minutes} minutes`;
  if (hours === 1) return "About an hour";
  if (hours < 48) return `${hours} hours`;
  if (days < 14) return `${days} days`;
  if (days < 90) return `${Math.floor(days / 7)} weeks`;
  if (days < 730) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} years`;
}

export function ago(timestamp: number): string {
  return `${humanDuration(Date.now() - timestamp)} ago`;
}

/** Équivalent de units.HumanSize (base 1000, 3 chiffres significatifs). */
export function humanSize(bytes: number): string {
  const units = ["B", "kB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${Number(value.toPrecision(3))}${units[unit]}`;
}

export function shortId(id: string): string {
  return id.slice(0, 12);
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function randomHex(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

export function json(value: unknown): string {
  return JSON.stringify(value, null, 4);
}

export const MB = 1_000_000;
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

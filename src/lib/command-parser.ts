import type { CommandRule, FlagRule } from "./types";

/**
 * Découpe une ligne de commande en tokens, en respectant les guillemets
 * simples et doubles (ex: `-e "A=b c"` → ["-e", "A=b c"]).
 */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

/**
 * Normalise les tokens :
 * - `--name=web` → `--name`, `web`
 * - `-it` → `-i`, `-t` (options courtes groupées)
 */
function normalize(tokens: string[]): string[] {
  return tokens.flatMap((token) => {
    if (token.startsWith("--") && token.includes("=")) {
      const index = token.indexOf("=");
      return [token.slice(0, index), token.slice(index + 1)];
    }
    if (/^-[a-zA-Z]{2,}$/.test(token)) {
      return token
        .slice(1)
        .split("")
        .map((letter) => `-${letter}`);
    }
    return [token];
  });
}

function startsWith(tokens: string[], prefix: string[]): boolean {
  return prefix.every((part, index) => tokens[index] === part);
}

/** Cherche une option dans les tokens et retire ce qu'elle consomme. */
function consumeFlag(tokens: string[], flag: FlagRule): boolean {
  for (let index = 0; index < tokens.length; index++) {
    if (!flag.names.includes(tokens[index])) continue;
    if (flag.value === undefined) {
      tokens.splice(index, 1);
      return true;
    }
    if (tokens[index + 1] === flag.value) {
      tokens.splice(index, 2);
      return true;
    }
  }
  return false;
}

export type MatchResult = { ok: true } | { ok: false; reason: string };

/** Vérifie qu'une commande saisie respecte la règle attendue. */
export function matchCommand(input: string, rule: CommandRule): MatchResult {
  const tokens = normalize(tokenize(input.trim()));
  if (tokens.length === 0) return { ok: false, reason: "Commande vide." };

  const prefix = rule.prefixes.find((candidate) => startsWith(tokens, candidate));
  if (!prefix) {
    return {
      ok: false,
      reason: `Ce n'est pas la bonne commande. Attendu : ${rule.prefixes
        .map((p) => p.join(" "))
        .join(" ou ")}`,
    };
  }

  const remaining = tokens.slice(prefix.length);

  for (const flag of rule.flags ?? []) {
    if (!consumeFlag(remaining, flag)) {
      const label = flag.value ? `${flag.names[0]} ${flag.value}` : flag.names[0];
      return { ok: false, reason: `Il manque l'option ${label}.` };
    }
  }

  const positionals = remaining.filter((token) => !token.startsWith("-"));
  const expectedArgs = rule.args ?? [];
  let cursor = 0;
  for (const arg of expectedArgs) {
    const found = positionals.indexOf(arg, cursor);
    if (found === -1) {
      return { ok: false, reason: `Il manque l'argument « ${arg} » (ou il n'est pas au bon endroit).` };
    }
    cursor = found + 1;
  }

  return { ok: true };
}

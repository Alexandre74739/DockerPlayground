/**
 * Analyse des arguments d'une commande Docker à partir de sa spécification.
 * Les messages d'erreur reproduisent ceux de la vraie CLI.
 */

export type OptionSpec = {
  names: string[];
  /** Type de la valeur attendue (ex: "string", "list"). Absent = option booléenne. */
  value?: string;
  description: string;
};

export type CommandSpec = {
  usage: string;
  description: string;
  options?: OptionSpec[];
  minArgs?: number;
  maxArgs?: number;
  /** Après le premier argument, tout est transmis tel quel (ex: commande de docker run). */
  stopAtFirstArg?: boolean;
};

export type Parsed = {
  options: Map<string, string[]>;
  args: string[];
};

export type ParseResult = { ok: true; parsed: Parsed } | { ok: false; error: string } | { ok: "help" };

const HELP: OptionSpec = { names: ["-h", "--help"], description: "Print usage" };

function key(option: OptionSpec): string {
  return option.names.find((name) => name.startsWith("--")) ?? option.names[0];
}

export function parseArgs(command: string, spec: CommandSpec, tokens: string[]): ParseResult {
  const specs = [...(spec.options ?? []), HELP];
  const find = (name: string) => specs.find((option) => option.names.includes(name));
  const options = new Map<string, string[]>();
  const args: string[] = [];
  const add = (option: OptionSpec, value: string) => options.set(key(option), [...(options.get(key(option)) ?? []), value]);
  const seeHelp = `See 'docker ${command} --help'.`;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if ((spec.stopAtFirstArg && args.length > 0) || !token.startsWith("-") || token === "-") {
      args.push(token);
      continue;
    }
    if (token === "--") {
      args.push(...tokens.slice(i + 1));
      break;
    }
    if (token.startsWith("--")) {
      const [name, inline] = token.includes("=")
        ? [token.slice(0, token.indexOf("=")), token.slice(token.indexOf("=") + 1)]
        : [token, undefined];
      const option = find(name);
      if (!option) return { ok: false, error: `unknown flag: ${name}\n${seeHelp}` };
      if (option === HELP) return { ok: "help" };
      if (option.value) {
        const value = inline ?? tokens[++i];
        if (value === undefined) return { ok: false, error: `flag needs an argument: ${name}\n${seeHelp}` };
        add(option, value);
      } else add(option, "true");
      continue;
    }
    const letters = token.slice(1);
    for (let j = 0; j < letters.length; j++) {
      const option = find(`-${letters[j]}`);
      if (!option) return { ok: false, error: `unknown shorthand flag: '${letters[j]}' in ${token}\n${seeHelp}` };
      if (option === HELP) return { ok: "help" };
      if (!option.value) {
        add(option, "true");
        continue;
      }
      const value = letters.slice(j + 1).replace(/^=/, "") || tokens[++i];
      if (value === undefined) return { ok: false, error: `flag needs an argument: '${letters[j]}' in ${token}\n${seeHelp}` };
      add(option, value);
      break;
    }
  }

  const usageBlock = `\n\nUsage:  ${spec.usage}\n\nSee 'docker ${command} --help' for more information`;
  if (spec.minArgs !== undefined && args.length < spec.minArgs) {
    const what =
      spec.minArgs === 1 && spec.maxArgs === 1
        ? "exactly 1 argument"
        : spec.minArgs === 1
          ? "at least 1 argument"
          : `at least ${spec.minArgs} arguments`;
    return { ok: false, error: `docker: 'docker ${command}' requires ${what}${usageBlock}` };
  }
  if (spec.maxArgs !== undefined && args.length > spec.maxArgs) {
    const what = spec.maxArgs === 0 ? "no arguments" : `at most ${spec.maxArgs} argument${spec.maxArgs > 1 ? "s" : ""}`;
    return { ok: false, error: `docker: 'docker ${command}' accepts ${what}${usageBlock}` };
  }
  return { ok: true, parsed: { options, args } };
}

export function has(parsed: Parsed, name: string): boolean {
  return parsed.options.has(name);
}

export function values(parsed: Parsed, name: string): string[] {
  return parsed.options.get(name) ?? [];
}

export function value(parsed: Parsed, name: string): string | undefined {
  return parsed.options.get(name)?.at(-1);
}

/** Texte de `docker <commande> --help`. */
export function formatHelp(spec: CommandSpec): string {
  const options = [...(spec.options ?? []), HELP];
  const labels = options.map((option) => {
    const short = option.names.find((name) => /^-[a-zA-Z]$/.test(name));
    const long = option.names.find((name) => name.startsWith("--"));
    const head = short ? `${short}${long ? ", " : ""}` : "    ";
    return `${head}${long ?? ""}${option.value ? ` ${option.value}` : ""}`;
  });
  const width = Math.max(...labels.map((label) => label.length));
  const lines = options.map((option, index) => `  ${labels[index].padEnd(width + 3)}${option.description}`);
  return `\nUsage:  ${spec.usage}\n\n${spec.description}\n\nOptions:\n${lines.join("\n")}`;
}

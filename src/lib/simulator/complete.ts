import { tokenize } from "../command-parser";
import { listDirectory, resolvePath } from "./state";
import type { SimState } from "./types";

/** Complétion par Tab, à la manière de bash. */

const DOCKER_COMMANDS = [
  "build",
  "builder",
  "buildx",
  "compose",
  "container",
  "context",
  "cp",
  "exec",
  "history",
  "image",
  "images",
  "info",
  "inspect",
  "kill",
  "login",
  "logout",
  "logs",
  "network",
  "ps",
  "pull",
  "push",
  "restart",
  "rm",
  "rmi",
  "run",
  "search",
  "start",
  "stats",
  "stop",
  "system",
  "tag",
  "top",
  "version",
  "volume",
];

const SUBCOMMANDS: Record<string, string[]> = {
  container: ["cp", "exec", "inspect", "kill", "logs", "ls", "prune", "restart", "rm", "run", "start", "stats", "stop", "top"],
  image: ["build", "history", "inspect", "ls", "prune", "pull", "push", "rm", "tag"],
  volume: ["create", "inspect", "ls", "prune", "rm"],
  network: ["connect", "create", "disconnect", "inspect", "ls", "prune", "rm"],
  system: ["df", "info", "prune"],
  context: ["ls", "show", "use"],
  compose: ["build", "config", "down", "exec", "logs", "ps", "restart", "start", "stop", "up"],
};

const HOST_COMMANDS = ["cat", "cd", "clear", "curl", "docker", "echo", "help", "ls", "mkdir", "pwd", "touch", "whoami"];

export type Completion = { line: string; options: string[] };

function commonPrefix(words: string[]): string {
  return words.reduce((prefix, word) => {
    let index = 0;
    while (index < prefix.length && prefix[index] === word[index]) index++;
    return prefix.slice(0, index);
  });
}

export function complete(state: SimState, line: string): Completion {
  const endsWithSpace = /\s$/.test(line) || line === "";
  const tokens = tokenize(line);
  const current = endsWithSpace ? "" : (tokens.pop() ?? "");
  const position = tokens.length;

  let candidates: string[];
  if (state.shell) candidates = [];
  else if (position === 0) candidates = HOST_COMMANDS;
  else if (tokens[0] === "docker" && position === 1) candidates = DOCKER_COMMANDS;
  else if (tokens[0] === "docker" && position === 2 && SUBCOMMANDS[tokens[1]]) candidates = SUBCOMMANDS[tokens[1]];
  else {
    const directory = current.includes("/") ? current.slice(0, current.lastIndexOf("/") + 1) : "";
    const files = listDirectory(state.files, state.dirs, resolvePath(state.cwd, directory || ".")).map((name) => directory + name);
    candidates = [
      ...state.containers.map((container) => container.name),
      ...state.images.flatMap((image) => image.tags.map((tag) => (tag.endsWith(":latest") ? tag.slice(0, -7) : tag))),
      ...state.volumes.map((volume) => volume.name),
      ...files,
    ];
  }

  const matches = [...new Set(candidates)].filter((candidate) => candidate.startsWith(current)).sort();
  if (matches.length === 0) return { line, options: [] };
  const base = line.slice(0, line.length - current.length);
  if (matches.length === 1) return { line: `${base}${matches[0]} `, options: [] };
  const prefix = commonPrefix(matches);
  return { line: base + prefix, options: prefix.length > current.length ? [] : matches };
}

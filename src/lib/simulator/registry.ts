import { formatHelp, parseArgs } from "./args";
import { type CommandDef, fail, ok, type Outcome } from "./command";
import { buildCommand } from "./commands/build";
import { composeCommands } from "./commands/compose";
import { containerCommands } from "./commands/containers";
import { hubCommands } from "./commands/hub";
import { imageCommands } from "./commands/images";
import { storageCommands } from "./commands/storage";
import { systemCommands, versionShort } from "./commands/system";
import type { SimState } from "./types";

const commands: CommandDef[] = [
  ...containerCommands,
  ...imageCommands,
  ...storageCommands,
  ...composeCommands,
  ...hubCommands,
  ...systemCommands,
];

const index = new Map<string, CommandDef>();
for (const command of commands) {
  for (const path of [command.path, ...(command.aliases ?? [])]) index.set(path, command);
}

const GROUPS: Record<string, string> = {
  builder: "Manage builds",
  buildx: "Docker Buildx",
  compose: "Docker Compose",
  container: "Manage containers",
  context: "Manage contexts",
  image: "Manage images",
  network: "Manage networks",
  system: "Manage Docker",
  volume: "Manage volumes",
};

const TOP_HELP = `
Usage:  docker [OPTIONS] COMMAND

A self-sufficient runtime for containers

Common Commands:
  run         Create and run a new container from an image
  exec        Execute a command in a running container
  ps          List containers
  build       Build an image from a Dockerfile
  pull        Download an image from a registry
  push        Upload an image to a registry
  images      List images
  login       Authenticate to a registry
  logout      Log out from a registry
  search      Search Docker Hub for images
  version     Show the Docker version information
  info        Display system-wide information

Management Commands:
  builder     Manage builds
  buildx*     Docker Buildx
  compose*    Docker Compose
  container   Manage containers
  context     Manage contexts
  image       Manage images
  network     Manage networks
  system      Manage Docker
  volume      Manage volumes

Commands:
  cp          Copy files/folders between a container and the local filesystem
  history     Show the history of an image
  inspect     Return low-level information on Docker objects
  kill        Kill one or more running containers
  logs        Fetch the logs of a container
  restart     Restart one or more containers
  rm          Remove one or more containers
  rmi         Remove one or more images
  start       Start one or more stopped containers
  stats       Display a live stream of container(s) resource usage statistics
  stop        Stop one or more running containers
  tag         Create a tag TARGET_IMAGE that refers to SOURCE_IMAGE
  top         Display the running processes of a container

Global Options:
  -h, --help      Print usage
  -v, --version   Print version information and quit

Run 'docker COMMAND --help' for more information on a command.

For more help on how to use Docker, head to https://docs.docker.com/go/guides/`;

function groupHelp(group: string): string {
  const subcommands = [...index.entries()]
    .filter(([path]) => path.startsWith(`${group} `) && path.split(" ").length === 2)
    .map(([path, command]) => [path.split(" ")[1], command.spec.description.split("\n")[0]] as const);
  const unique = [...new Map(subcommands).entries()].sort(([a], [b]) => a.localeCompare(b));
  const width = Math.max(...unique.map(([name]) => name.length));
  return `\nUsage:  docker ${group} COMMAND\n\n${GROUPS[group]}\n\nCommands:\n${unique
    .map(([name, description]) => `  ${name.padEnd(width + 3)}${description}`)
    .join("\n")}\n\nRun 'docker ${group} COMMAND --help' for more information on a command.`;
}

/** Exécute `docker <args>` sur l'état fourni (modifié en place). */
export function runDocker(state: SimState, args: string[]): Outcome {
  if (args.length === 0 || (args.length === 1 && ["--help", "-h", "help"].includes(args[0]))) return ok(TOP_HELP);
  if (args[0] === "--version" || args[0] === "-v") return ok(versionShort);
  if (args[0] === "help") return runDocker(state, [...args.slice(1), "--help"]);
  if (args[0] === "builder" && args[1] === "build") return runCommand(state, buildCommand, "builder build", args.slice(2));

  for (const length of [3, 2, 1]) {
    const path = args.slice(0, length).join(" ");
    const command = index.get(path);
    if (command && args.length >= length) return runCommand(state, command, path, args.slice(length));
  }

  const [first, second] = args;
  if (GROUPS[first]) {
    if (!second || second.startsWith("-")) return ok(groupHelp(first));
    return fail(
      `docker: unknown command: docker ${first} ${second}\n\nUsage:  docker ${first} COMMAND\n\nRun 'docker ${first} --help' for more information`,
    );
  }
  if (first.startsWith("-")) return fail(`unknown flag: ${first}\nSee 'docker --help'.`, 125);
  return fail(`docker: '${first}' is not a docker command.\nSee 'docker --help'`);
}

function runCommand(state: SimState, command: CommandDef, path: string, rest: string[]): Outcome {
  const parsed = parseArgs(path, command.spec, rest);
  if (parsed.ok === "help") return ok(formatHelp(command.spec));
  if (!parsed.ok) return fail(parsed.error, command.path === "container run" ? 125 : 1);
  return command.run({ state, parsed: parsed.parsed, command: path });
}

import { has, value, values } from "../args";
import { type CommandDef, confirm, daemonError, fail, foreground, join, ok, type Outcome } from "../command";
import { ago, humanSize, json, MB, shortId, table } from "../format";
import {
  commandText,
  containerLogs,
  createContainer,
  displayCommand,
  inspectContainer,
  launchPlan,
  portsText,
  setExited,
  setRunning,
  statusText,
} from "../runtime";
import { hasShell, openSessionBanner, runInContainer } from "../shell";
import { findContainer, findImage, isValidReference, resolvePath } from "../state";
import type { Container, Mount, PortBinding, ShellName, SimState } from "../types";
import { inspectImage, pullImage } from "./images";

const noSuchContainer = (name: string) => daemonError(`No such container: ${name}`);

function parsePorts(specs: string[]): PortBinding[] | string {
  const ports: PortBinding[] = [];
  for (const spec of specs) {
    const parts = spec.split(":");
    const containerPort = parts.at(-1)!;
    const host = parts.length >= 2 ? parts.at(-2)! : String(32768 + ports.length);
    if (!/^\d+(\/(tcp|udp))?$/.test(containerPort)) return `docker: invalid containerPort: ${containerPort}.\nSee 'docker run --help'.`;
    if (!/^\d+$/.test(host)) return `docker: invalid hostPort: ${host}.\nSee 'docker run --help'.`;
    ports.push({ host, container: containerPort });
  }
  return ports;
}

function parseMounts(state: SimState, specs: string[]): Mount[] | string {
  const mounts: Mount[] = [];
  for (const spec of specs) {
    const [source, target, mode] = spec.split(":");
    if (!target) {
      if (!source.startsWith("/"))
        return `docker: Error response from daemon: invalid volume specification: '${spec}': invalid mount config for type "volume": invalid mount path: '${source}' mount path must be absolute.`;
      mounts.push({
        type: "volume",
        source: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
        target: source,
        readOnly: false,
      });
      continue;
    }
    if (!target.startsWith("/")) {
      return `docker: Error response from daemon: invalid volume specification: '${spec}': invalid mount config for type "${/^[./~]/.test(source) ? "bind" : "volume"}": invalid mount path: '${target}' mount path must be absolute.`;
    }
    const isBind = /^[./~]/.test(source);
    mounts.push({
      type: isBind ? "bind" : "volume",
      source: isBind ? resolvePath(state.cwd, source) : source,
      target,
      readOnly: mode === "ro",
    });
  }
  return mounts;
}

/** Démarre le processus principal et gère attachement / session interactive. */
export function startContainer(
  state: SimState,
  container: Container,
  mode: { detach: boolean; interactive: boolean; prefix?: string },
): Outcome {
  const plan = launchPlan(container, mode.interactive, (argv) => runInContainer(state, container, argv));
  const prefix = mode.prefix ? `${mode.prefix}\n` : "";
  const id = mode.detach ? container.id : "";

  switch (plan.type) {
    case "error":
      container.exitCode = plan.code;
      if (container.autoRemove) state.containers = state.containers.filter((other) => other.id !== container.id);
      return fail(
        join(
          prefix + id,
          `docker: Error response from daemon: ${plan.message}`,
          "",
          "Run 'docker run --help' for more information",
        ).replace(/^\n/, ""),
        plan.code,
      );
    case "server":
      setRunning(container);
      if (mode.detach) return ok(prefix + id);
      return {
        out: prefix + containerLogs(container),
        prompt: foreground((next) => {
          const current = next.containers.find((other) => other.id === container.id);
          if (current) setExited(next, current, 0);
          return { out: "", code: 130 };
        }),
      };
    case "interactive":
      setRunning(container);
      if (mode.detach) return ok(prefix + id);
      state.shell = {
        containerId: container.id,
        shell: plan.shell,
        cwd: state.images.find((image) => image.id === container.imageId)?.workdir ?? "/",
        stopOnExit: true,
      };
      return ok((prefix + openSessionBanner(plan.shell)).replace(/\n$/, ""));
    case "exit":
      container.output = plan.output;
      setExited(state, container, plan.code);
      return { out: (prefix + (mode.detach ? id : plan.output)).replace(/\n$/, ""), code: mode.detach ? 0 : plan.code };
  }
}

const run: CommandDef = {
  path: "container run",
  aliases: ["run"],
  spec: {
    usage: "docker run [OPTIONS] IMAGE [COMMAND] [ARG...]",
    description: "Create and run a new container from an image",
    minArgs: 1,
    stopAtFirstArg: true,
    options: [
      { names: ["-d", "--detach"], description: "Run container in background and print container ID" },
      { names: ["-e", "--env"], value: "list", description: "Set environment variables" },
      { names: ["-i", "--interactive"], description: "Keep STDIN open even if not attached" },
      { names: ["--name"], value: "string", description: "Assign a name to the container" },
      { names: ["--network", "--net"], value: "network", description: "Connect a container to a network" },
      { names: ["-p", "--publish"], value: "list", description: "Publish a container's port(s) to the host" },
      { names: ["--restart"], value: "string", description: 'Restart policy to apply when a container exits (default "no")' },
      { names: ["--rm"], description: "Automatically remove the container and its associated anonymous volumes when it exits" },
      { names: ["-t", "--tty"], description: "Allocate a pseudo-TTY" },
      { names: ["-v", "--volume"], value: "list", description: "Bind mount a volume" },
      { names: ["-w", "--workdir"], value: "string", description: "Working directory inside the container" },
    ],
  },
  run: ({ state, parsed }) => {
    const [imageInput, ...command] = parsed.args;
    if (!isValidReference(imageInput)) return fail("docker: invalid reference format.\nSee 'docker run --help'.", 125);

    const name = value(parsed, "--name");
    if (name !== undefined && !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) {
      return fail(
        `docker: Error response from daemon: Invalid container name (${name}), only [a-zA-Z0-9][a-zA-Z0-9_.-] are allowed.\n\nRun 'docker run --help' for more information`,
        125,
      );
    }
    const existing = name ? findContainer(state, name) : undefined;
    if (existing && existing.name === name) {
      return fail(
        `docker: Error response from daemon: Conflict. The container name "/${name}" is already in use by container "${existing.id}". You have to remove (or rename) that container to be able to reuse that name.\n\nRun 'docker run --help' for more information`,
        125,
      );
    }
    const ports = parsePorts(values(parsed, "--publish"));
    if (typeof ports === "string") return fail(ports, 125);
    const mounts = parseMounts(state, values(parsed, "--volume"));
    if (typeof mounts === "string") return fail(mounts, 125);
    const network = value(parsed, "--network") ?? "bridge";
    if (!state.networks.some((candidate) => candidate.name === network)) {
      return fail(`docker: Error response from daemon: network ${network} not found.\n\nRun 'docker run --help' for more information`, 125);
    }

    let pullOutput: string | undefined;
    let image = findImage(state, imageInput);
    if (!image) {
      const pulled = pullImage(state, imageInput, { quietTag: true });
      if (!pulled.image) {
        return fail(
          `Unable to find image '${imageInput.includes(":") ? imageInput : `${imageInput}:latest`}' locally\ndocker: Error response from daemon: ${pulled.output}\n\nRun 'docker run --help' for more information`,
          125,
        );
      }
      image = pulled.image;
      pullOutput = `Unable to find image '${pulled.ref}' locally\n${pulled.output}`;
    }

    for (const mount of mounts) {
      if (mount.type === "volume" && !state.volumes.some((volume) => volume.name === mount.source)) {
        state.volumes.push({ name: mount.source, createdAt: Date.now() });
      }
    }

    const container = createContainer(state, {
      name,
      imageInput,
      image,
      command,
      ports,
      env: values(parsed, "--env").map((entry) => (entry.includes("=") ? entry : `${entry}=`)),
      mounts,
      networks: [network],
      autoRemove: has(parsed, "--rm"),
    });

    const busy = ports.find((port) =>
      state.containers.some(
        (other) => other !== container && other.status === "running" && other.ports.some((bind) => bind.host === port.host),
      ),
    );
    if (busy) {
      return fail(
        join(
          pullOutput,
          has(parsed, "--detach") ? container.id : undefined,
          `docker: Error response from daemon: driver failed programming external connectivity on endpoint ${container.name} (${container.id}): Bind for 0.0.0.0:${busy.host} failed: port is already allocated.`,
          "",
          "Run 'docker run --help' for more information",
        ),
        125,
      );
    }

    const interactive = has(parsed, "--interactive") && has(parsed, "--tty");
    return startContainer(state, container, { detach: has(parsed, "--detach"), interactive, prefix: pullOutput });
  },
};

const ps: CommandDef = {
  path: "container ls",
  aliases: ["ps", "container ps", "container list"],
  spec: {
    usage: "docker ps [OPTIONS]",
    description: "List containers",
    maxArgs: 0,
    options: [
      { names: ["-a", "--all"], description: "Show all containers (default shows just running)" },
      { names: ["-q", "--quiet"], description: "Only display container IDs" },
      { names: ["-s", "--size"], description: "Display total file sizes" },
      { names: ["-n", "--last"], value: "int", description: "Show n last created containers (includes all states)" },
    ],
  },
  run: ({ state, parsed }) => {
    const list = state.containers
      .filter((container) => has(parsed, "--all") || has(parsed, "--last") || container.status === "running")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, has(parsed, "--last") ? Number(value(parsed, "--last")) : undefined);
    if (has(parsed, "--quiet")) return ok(list.map((container) => shortId(container.id)).join("\n"));
    return ok(
      table(
        ["CONTAINER ID", "IMAGE", "COMMAND", "CREATED", "STATUS", "PORTS", "NAMES"],
        list.map((container) => [
          shortId(container.id),
          container.image,
          displayCommand(container),
          ago(container.createdAt),
          statusText(container),
          portsText(state, container),
          container.name,
        ]),
      ),
    );
  },
};

const logs: CommandDef = {
  path: "container logs",
  aliases: ["logs"],
  spec: {
    usage: "docker logs [OPTIONS] CONTAINER",
    description: "Fetch the logs of a container",
    minArgs: 1,
    maxArgs: 1,
    options: [
      { names: ["-f", "--follow"], description: "Follow log output" },
      { names: ["-n", "--tail"], value: "string", description: 'Number of lines to show from the end of the logs (default "all")' },
      { names: ["-t", "--timestamps"], description: "Show timestamps" },
    ],
  },
  run: ({ state, parsed }) => {
    const container = findContainer(state, parsed.args[0]);
    if (!container) return noSuchContainer(parsed.args[0]);
    let lines = containerLogs(container).split("\n");
    const tail = value(parsed, "--tail");
    if (tail && tail !== "all") lines = lines.slice(-Number(tail));
    if (has(parsed, "--timestamps")) lines = lines.map((line) => `${new Date(container.createdAt).toISOString()} ${line}`);
    const out = lines.join("\n");
    if (has(parsed, "--follow") && container.status === "running") return { out, prompt: foreground(() => ({ code: 0 })) };
    return ok(out);
  },
};

function eachContainer(state: SimState, names: string[], action: (container: Container) => string | undefined): Outcome {
  const lines: string[] = [];
  let code = 0;
  for (const name of names) {
    const container = findContainer(state, name);
    if (!container) {
      lines.push(`Error response from daemon: No such container: ${name}`);
      code = 1;
      continue;
    }
    const error = action(container);
    if (error) {
      lines.push(error);
      code = 1;
    } else lines.push(name);
  }
  return { out: lines.join("\n"), code };
}

const lifecycle = (
  path: string,
  verb: string,
  description: string,
  action: (state: SimState, container: Container) => string | undefined,
): CommandDef => ({
  path: `container ${path}`,
  aliases: [path],
  spec: { usage: `docker ${verb} [OPTIONS] CONTAINER [CONTAINER...]`, description, minArgs: 1, options: [] },
  run: ({ state, parsed }) => eachContainer(state, parsed.args, (container) => action(state, container)),
});

const stop = lifecycle("stop", "stop", "Stop one or more running containers", (state, container) => {
  if (container.status === "running") setExited(state, container, 0);
  return undefined;
});
const kill = lifecycle("kill", "kill", "Kill one or more running containers", (state, container) => {
  if (container.status !== "running")
    return `Error response from daemon: cannot kill container: ${container.name}: container ${container.id} is not running`;
  setExited(state, container, 137);
  return undefined;
});
const start = lifecycle("start", "start", "Start one or more stopped containers", (state, container) => {
  if (container.status === "running") return undefined;
  const result = startContainer(state, container, { detach: true, interactive: false });
  return result.code
    ? result.out
        ?.split("\n")
        .find((line) => line.startsWith("docker:"))
        ?.replace("docker: ", "")
    : undefined;
});
const restart = lifecycle("restart", "restart", "Restart one or more containers", (state, container) => {
  if (container.status === "running") setExited(state, container, 0);
  const result = startContainer(state, container, { detach: true, interactive: false });
  return result.code ? result.out : undefined;
});

const rm: CommandDef = {
  path: "container rm",
  aliases: ["rm", "container remove"],
  spec: {
    usage: "docker rm [OPTIONS] CONTAINER [CONTAINER...]",
    description: "Remove one or more containers",
    minArgs: 1,
    options: [
      { names: ["-f", "--force"], description: "Force the removal of a running container (uses SIGKILL)" },
      { names: ["-v", "--volumes"], description: "Remove anonymous volumes associated with the container" },
    ],
  },
  run: ({ state, parsed }) =>
    eachContainer(state, parsed.args, (container) => {
      if (container.status === "running" && !has(parsed, "--force")) {
        return `Error response from daemon: cannot remove container "/${container.name}": container is running: stop the container before removing or force remove`;
      }
      state.containers = state.containers.filter((other) => other.id !== container.id);
      if (state.shell?.containerId === container.id) state.shell = null;
      return undefined;
    }),
};

const exec: CommandDef = {
  path: "container exec",
  aliases: ["exec"],
  spec: {
    usage: "docker exec [OPTIONS] CONTAINER COMMAND [ARG...]",
    description: "Execute a command in a running container",
    minArgs: 2,
    stopAtFirstArg: true,
    options: [
      { names: ["-d", "--detach"], description: "Detached mode: run command in the background" },
      { names: ["-e", "--env"], value: "list", description: "Set environment variables" },
      { names: ["-i", "--interactive"], description: "Keep STDIN open even if not attached" },
      { names: ["-t", "--tty"], description: "Allocate a pseudo-TTY" },
      { names: ["-u", "--user"], value: "string", description: "Username or UID" },
      { names: ["-w", "--workdir"], value: "string", description: "Working directory inside the container" },
    ],
  },
  run: ({ state, parsed }) => {
    const [name, ...argv] = parsed.args;
    const container = findContainer(state, name);
    if (!container) return noSuchContainer(name);
    return execIn(state, container, argv, has(parsed, "--interactive") && has(parsed, "--tty"), value(parsed, "--workdir"));
  },
};

const SHELLS: Record<string, ShellName> = {
  sh: "sh",
  "/bin/sh": "sh",
  bash: "bash",
  "/bin/bash": "bash",
  node: "node",
  python: "python",
  python3: "python",
};

/** Partagé avec docker compose exec. */
export function execIn(state: SimState, container: Container, argv: string[], interactive: boolean, workdir?: string): Outcome {
  if (container.status !== "running") return daemonError(`container ${container.id} is not running`);
  const shell = argv.length === 1 ? SHELLS[argv[0]] : undefined;
  if (shell) {
    if (!hasShell(container, shell)) {
      return fail(
        `OCI runtime exec failed: exec failed: unable to start container process: exec: "${argv[0]}": executable file not found in $PATH: unknown`,
        126,
      );
    }
    if (!interactive) return ok();
    const cwd = workdir ?? state.images.find((image) => image.id === container.imageId)?.workdir ?? "/";
    state.shell = { containerId: container.id, shell, cwd, stopOnExit: false };
    return ok(openSessionBanner(shell));
  }
  const result = runInContainer(state, container, argv, workdir);
  if (result.code === 127) {
    return fail(
      `OCI runtime exec failed: exec failed: unable to start container process: exec: "${argv[0]}": executable file not found in $PATH: unknown`,
      127,
    );
  }
  return { out: result.out, code: result.code };
}

/** Valeur d'un chemin Go template simple : {{.State.Status}}. */
function applyFormat(format: string, data: unknown): string {
  return format.replace(/\{\{\s*(?:json\s+)?\.([\w.]+)\s*\}\}/g, (_, path: string) => {
    const result = path.split(".").reduce<unknown>((current, key) => (current as Record<string, unknown> | undefined)?.[key], data);
    if (result === undefined) return "<no value>";
    return typeof result === "object" ? JSON.stringify(result) : String(result);
  });
}

const inspect: CommandDef = {
  path: "inspect",
  spec: {
    usage: "docker inspect [OPTIONS] NAME|ID [NAME|ID...]",
    description: "Return low-level information on Docker objects",
    minArgs: 1,
    options: [{ names: ["-f", "--format"], value: "string", description: "Format output using a custom template" }],
  },
  run: ({ state, parsed }) => {
    const found: unknown[] = [];
    for (const name of parsed.args) {
      const container = findContainer(state, name);
      const image = container ? undefined : findImage(state, name);
      const volume = state.volumes.find((candidate) => candidate.name === name);
      const network = state.networks.find((candidate) => candidate.name === name || candidate.id.startsWith(name));
      const data = container
        ? inspectContainer(state, container)
        : image
          ? inspectImage(image)
          : volume
            ? { Name: volume.name, Driver: "local", Mountpoint: `/var/lib/docker/volumes/${volume.name}/_data`, Scope: "local" }
            : network
              ? { Name: network.name, Id: network.id, Driver: network.driver, Scope: "local" }
              : undefined;
      if (!data) {
        const format = value(parsed, "--format");
        return fail(join(format ? undefined : json(found), `Error: No such object: ${name}`));
      }
      found.push(data);
    }
    const format = value(parsed, "--format");
    return ok(format ? found.map((data) => applyFormat(format, data)).join("\n") : json(found));
  },
};

const containerInspect: CommandDef = {
  ...inspect,
  path: "container inspect",
  spec: {
    ...inspect.spec,
    usage: "docker container inspect [OPTIONS] CONTAINER [CONTAINER...]",
    description: "Display detailed information on one or more containers",
  },
  run: (ctx) => {
    const missing = ctx.parsed.args.find((name) => !findContainer(ctx.state, name));
    if (missing) return fail(`[]\nError: No such container: ${missing}`);
    return inspect.run(ctx);
  },
};

function statsTable(state: SimState, names: string[]): Outcome {
  const containers = names.length
    ? names.map((name) => findContainer(state, name))
    : state.containers.filter((container) => container.status === "running");
  const missing = names.find((name, index) => !containers[index]);
  if (missing) return fail(`Error response from daemon: No such container: ${missing}`);
  const rows = (containers as Container[]).map((container, index) => {
    const memory = container.status === "running" ? 8 + ((index * 17 + container.name.length * 7) % 60) : 0;
    return [
      shortId(container.id),
      container.name,
      container.status === "running" ? `${(0.01 + index * 0.13).toFixed(2)}%` : "0.00%",
      `${memory.toFixed(2)}MiB / 7.66GiB`,
      `${((memory / 7840) * 100).toFixed(2)}%`,
      container.status === "running" ? "1.21kB / 0B" : "0B / 0B",
      "0B / 0B",
      container.status === "running" ? String(1 + (index % 5)) : "0",
    ];
  });
  return ok(table(["CONTAINER ID", "NAME", "CPU %", "MEM USAGE / LIMIT", "MEM %", "NET I/O", "BLOCK I/O", "PIDS"], rows));
}

const stats: CommandDef = {
  path: "container stats",
  aliases: ["stats"],
  spec: {
    usage: "docker stats [OPTIONS] [CONTAINER...]",
    description: "Display a live stream of container(s) resource usage statistics",
    options: [
      { names: ["-a", "--all"], description: "Show all containers (default shows just running)" },
      { names: ["--no-stream"], description: "Disable streaming stats and only pull the first result" },
    ],
  },
  run: ({ state, parsed }) => {
    const result = statsTable(state, parsed.args);
    if (result.code || has(parsed, "--no-stream")) return result;
    return { out: result.out, prompt: foreground(() => ({ code: 0 })) };
  },
};

const top: CommandDef = {
  path: "container top",
  aliases: ["top"],
  spec: { usage: "docker top CONTAINER [ps OPTIONS]", description: "Display the running processes of a container", minArgs: 1 },
  run: ({ state, parsed }) => {
    const container = findContainer(state, parsed.args[0]);
    if (!container) return noSuchContainer(parsed.args[0]);
    if (container.status !== "running") return daemonError(`container ${container.id} is not running`);
    const rows = [["root", "2101", "2080", "0", "10:12", "?", "00:00:00", commandText(container)]];
    if (container.kind === "nginx") rows.push(["101", "2150", "2101", "0", "10:12", "?", "00:00:00", "nginx: worker process"]);
    return ok(table(["UID", "PID", "PPID", "C", "STIME", "TTY", "TIME", "CMD"], rows));
  },
};

const cp: CommandDef = {
  path: "container cp",
  aliases: ["cp"],
  spec: {
    usage: "docker cp [OPTIONS] CONTAINER:SRC_PATH DEST_PATH|-\n\tdocker cp [OPTIONS] SRC_PATH|- CONTAINER:DEST_PATH",
    description: "Copy files/folders between a container and the local filesystem",
    minArgs: 2,
    maxArgs: 2,
  },
  run: ({ state, parsed }) => {
    const [source, destination] = parsed.args;
    const split = (arg: string) => (/^[\w.-]+:/.test(arg) ? [arg.slice(0, arg.indexOf(":")), arg.slice(arg.indexOf(":") + 1)] : null);
    const from = split(source);
    const to = split(destination);
    if (!from === !to) return fail("must specify at least one container source");
    const [name, path] = (from ?? to)!;
    const container = findContainer(state, name);
    if (!container) return daemonError(`No such container: ${name}`);

    if (from) {
      const files = Object.entries(container.fs).filter(([file]) => file === path || file.startsWith(`${path.replace(/\/$/, "")}/`));
      if (files.length === 0) return daemonError(`Could not find the file ${path} in container ${name}`);
      const target = resolvePath(state.cwd, destination);
      const isDir = target === state.cwd || state.dirs.includes(target);
      let size = 0;
      for (const [file, content] of files) {
        const relative = file === path ? file.split("/").pop()! : file.slice(path.replace(/\/$/, "").lastIndexOf("/") + 1);
        state.files[isDir ? `${target}/${relative}` : target] = content;
        size += content.length;
      }
      return ok(`Successfully copied ${humanSize(size)} to ${isDir ? `${target}/.` : target}`);
    }
    const hostPath = resolvePath(state.cwd, source);
    const content = state.files[hostPath];
    if (content === undefined) return fail(`lstat ${hostPath}: no such file or directory`);
    const target = path.endsWith("/") ? `${path}${source.split("/").pop()}` : path;
    container.fs[target] = content;
    return ok(`Successfully copied ${humanSize(content.length)} to ${name}:${path}`);
  },
};

const prune: CommandDef = {
  path: "container prune",
  spec: {
    usage: "docker container prune [OPTIONS]",
    description: "Remove all stopped containers",
    maxArgs: 0,
    options: [{ names: ["-f", "--force"], description: "Do not prompt for confirmation" }],
  },
  run: ({ state, parsed }) => {
    const action = (current: SimState): Outcome => {
      const removed = current.containers.filter((container) => container.status !== "running");
      current.containers = current.containers.filter((container) => container.status === "running");
      const space = removed.length * 0.0011 * MB;
      return ok(
        join(
          removed.length ? `Deleted Containers:\n${removed.map((container) => container.id).join("\n")}\n` : undefined,
          `Total reclaimed space: ${humanSize(space)}`,
        ),
      );
    };
    const warning = "WARNING! This will remove all stopped containers.";
    if (has(parsed, "--force")) return action(state);
    return { out: warning, prompt: confirm(action) };
  },
};

export const containerCommands: CommandDef[] = [
  run,
  ps,
  logs,
  stop,
  start,
  restart,
  kill,
  rm,
  exec,
  inspect,
  containerInspect,
  stats,
  top,
  cp,
  prune,
];

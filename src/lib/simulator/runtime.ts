import { catalog, logsFor, shellsFor } from "./catalog";
import { ago, humanDuration, randomHex, shortId, truncate } from "./format";
import { generateName } from "./state";
import type { Container, Image, Mount, PortBinding, ShellName, SimState } from "./types";

/** Création, démarrage et description des conteneurs. */

export type ContainerOptions = {
  name?: string;
  imageInput: string;
  image: Image;
  command?: string[];
  ports?: PortBinding[];
  env?: string[];
  mounts?: Mount[];
  networks?: string[];
  autoRemove?: boolean;
  compose?: Container["compose"];
};

export function createContainer(state: SimState, options: ContainerOptions): Container {
  const now = Date.now();
  const container: Container = {
    id: randomHex(64),
    name: options.name ?? generateName(state),
    image: options.imageInput,
    imageId: options.image.id,
    command: options.command?.length ? options.command : options.image.cmd,
    status: "created",
    exitCode: 0,
    createdAt: now,
    changedAt: now,
    ports: options.ports ?? [],
    env: [...options.image.env, ...(options.env ?? [])],
    mounts: options.mounts ?? [],
    networks: options.networks ?? ["bridge"],
    autoRemove: options.autoRemove ?? false,
    fs: { ...options.image.fs },
    kind: options.image.kind,
    alpine: options.image.alpine,
    compose: options.compose,
  };
  state.containers.push(container);
  return container;
}

const SHELL_PATHS: Record<string, ShellName> = {
  sh: "sh",
  "/bin/sh": "sh",
  bash: "bash",
  "/bin/bash": "bash",
  node: "node",
  python: "python",
  python3: "python",
};

/** Ce que fait le processus principal au démarrage du conteneur. */
export type Launch =
  | { type: "server" }
  | { type: "interactive"; shell: ShellName }
  | { type: "exit"; code: number; output: string }
  | { type: "error"; message: string; code: number };

export function launchPlan(container: Container, interactive: boolean, run: (argv: string[]) => { out: string; code: number }): Launch {
  const entry = container.kind === "app" ? undefined : catalog[container.kind];
  const [program, ...rest] = container.command;
  const isDefault = !entry || entry.cmd.join(" ") === container.command.join(" ");

  if (entry?.requiredEnv && !entry.requiredEnv.names.some((name) => container.env.some((env) => env.startsWith(`${name}=`)))) {
    return { type: "exit", code: 1, output: entry.requiredEnv.error };
  }
  if (container.kind === "hello-world" && isDefault) return { type: "exit", code: 0, output: logsFor("hello-world", container) };
  if (isDefault && (entry?.longRunning || (container.kind === "app" && !(program in SHELL_PATHS)))) return { type: "server" };

  const shell = SHELL_PATHS[program];
  if (shell && rest.length === 0) {
    const available = shell === "sh" || shell === "bash" ? shellsFor(container.kind, container.alpine).includes(shell) : true;
    if (!available) {
      return {
        type: "error",
        code: 127,
        message: `failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: exec: "${program}": executable file not found in $PATH: unknown`,
      };
    }
    return interactive ? { type: "interactive", shell } : { type: "exit", code: 0, output: "" };
  }
  const result = run(container.command);
  if (result.code === 127) {
    return {
      type: "error",
      code: 127,
      message: `failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: exec: "${program}": executable file not found in $PATH: unknown`,
    };
  }
  return { type: "exit", code: result.code, output: result.out };
}

export function setRunning(container: Container) {
  container.status = "running";
  container.exitCode = 0;
  container.changedAt = Date.now();
}

export function setExited(state: SimState, container: Container, code = 0) {
  container.status = "exited";
  container.exitCode = code;
  container.changedAt = Date.now();
  if (container.autoRemove) state.containers = state.containers.filter((other) => other.id !== container.id);
  if (state.shell?.containerId === container.id) state.shell = null;
}

export function containerLogs(container: Container): string {
  return container.output ?? logsFor(container.kind, container);
}

// ─── Affichage ─────────────────────────────────────────────────────────────

const ENTRYPOINTS: Partial<Record<Container["kind"], string>> = {
  nginx: "/docker-entrypoint.sh",
  postgres: "docker-entrypoint.sh",
  redis: "docker-entrypoint.sh",
  node: "docker-entrypoint.sh",
  mysql: "docker-entrypoint.sh",
  mongo: "docker-entrypoint.sh",
  app: "docker-entrypoint.sh",
};

export function commandText(container: Container): string {
  const entrypoint = ENTRYPOINTS[container.kind];
  return [entrypoint, ...container.command].filter(Boolean).join(" ");
}

export function displayCommand(container: Container): string {
  return `"${truncate(commandText(container), 20)}"`;
}

export function statusText(container: Container): string {
  if (container.status === "running") return `Up ${humanDuration(Date.now() - container.changedAt)}`;
  if (container.status === "exited") return `Exited (${container.exitCode}) ${ago(container.changedAt)}`;
  return "Created";
}

export function portsText(state: SimState, container: Container): string {
  if (container.status !== "running") return "";
  const image = state.images.find((candidate) => candidate.id === container.imageId);
  const bound = container.ports.map(
    (port) => `0.0.0.0:${port.host}->${port.container.includes("/") ? port.container : `${port.container}/tcp`}`,
  );
  const exposed = (image?.exposed ?? []).filter(
    (port) => !container.ports.some((bind) => port.startsWith(`${bind.container.split("/")[0]}/`)),
  );
  return [...exposed, ...bound].join(", ");
}

export function ipAddress(state: SimState, container: Container, network = container.networks[0]): string {
  const members = state.containers.filter((other) => other.networks.includes(network));
  const subnet = network === "bridge" ? 17 : 18 + Math.max(0, state.networks.findIndex((net) => net.name === network) - 3);
  return `172.${subnet}.0.${members.indexOf(container) + 2}`;
}

export function inspectContainer(state: SimState, container: Container) {
  const running = container.status === "running";
  const iso = (time: number) => new Date(time).toISOString();
  const portMap = Object.fromEntries(
    container.ports.map((port) => [`${port.container.split("/")[0]}/tcp`, [{ HostIp: "0.0.0.0", HostPort: port.host }]]),
  );
  return {
    Id: container.id,
    Created: iso(container.createdAt),
    Path: container.command[0],
    Args: container.command.slice(1),
    State: {
      Status: container.status,
      Running: running,
      Paused: false,
      Restarting: false,
      ExitCode: container.exitCode,
      StartedAt: iso(container.createdAt),
      FinishedAt: running ? "0001-01-01T00:00:00Z" : iso(container.changedAt),
    },
    Image: `sha256:${container.imageId}`,
    Name: `/${container.name}`,
    HostConfig: {
      Binds: container.mounts.map((mount) => `${mount.source}:${mount.target}${mount.readOnly ? ":ro" : ""}`),
      PortBindings: portMap,
      AutoRemove: container.autoRemove,
      NetworkMode: container.networks[0],
    },
    Mounts: container.mounts.map((mount) => ({
      Type: mount.type,
      ...(mount.type === "volume"
        ? { Name: mount.source, Source: `/var/lib/docker/volumes/${mount.source}/_data` }
        : { Source: mount.source }),
      Destination: mount.target,
      Mode: mount.readOnly ? "ro" : "z",
      RW: !mount.readOnly,
    })),
    Config: {
      Hostname: shortId(container.id),
      Env: container.env,
      Cmd: container.command,
      Image: container.image,
      WorkingDir: state.images.find((image) => image.id === container.imageId)?.workdir ?? "/",
      Labels: container.compose
        ? { "com.docker.compose.project": container.compose.project, "com.docker.compose.service": container.compose.service }
        : {},
    },
    NetworkSettings: {
      Ports: running ? portMap : {},
      IPAddress: running && container.networks.includes("bridge") ? ipAddress(state, container, "bridge") : "",
      Networks: Object.fromEntries(
        container.networks.map((network) => [
          network,
          {
            IPAddress: running ? ipAddress(state, container, network) : "",
            Gateway: running ? ipAddress(state, container, network).replace(/\d+$/, "1") : "",
          },
        ]),
      ),
    },
  };
}

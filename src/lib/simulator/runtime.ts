import { catalog, logsFor, shellsFor } from "./catalog";
import { buildContainer, type ContainerOptions, envValue } from "./container";
import { ago, humanDuration, shortId, truncate } from "./format";
import { generateName } from "./state";
import type { Container, ShellName, SimState } from "./types";

/** Création, démarrage et description des conteneurs. */

export function createContainer(state: SimState, options: Omit<ContainerOptions, "name"> & { name?: string }): Container {
  const container = buildContainer({ ...options, name: options.name ?? generateName(state) });
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

export type Runner = (container: Container, argv: string[]) => { out: string; code: number };

export function launchPlan(state: SimState, container: Container, interactive: boolean, run: Runner): Launch {
  const entry = container.kind === "app" ? undefined : catalog[container.kind];
  const [program, ...rest] = container.command;
  const isDefault = !entry || entry.cmd.join(" ") === container.command.join(" ");

  if (entry?.requiredEnv && !entry.requiredEnv.names.some((name) => Boolean(envValue(container.env, name)))) {
    return { type: "exit", code: 1, output: entry.requiredEnv.error };
  }
  if (container.kind === "hello-world" && isDefault) return { type: "exit", code: 0, output: logsFor("hello-world", container) };
  const shellOnly = program in SHELL_PATHS && rest.length === 0;
  if (container.kind === "app" && isDefault && !shellOnly) {
    const failure = appFailure(state, container);
    if (failure) return { type: "exit", code: 1, output: crashLog(failure) };
    return { type: "server" };
  }
  if (isDefault && entry?.longRunning) return { type: "server" };

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
  const result = run(container, container.command);
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
  container.output = undefined;
  container.changedAt = Date.now();
}

const RESTARTING_POLICIES = ["always", "unless-stopped", "on-failure"];

/** Fin du processus principal : arrêt, ou redémarrage en boucle selon la politique --restart. */
export function setExited(state: SimState, container: Container, code = 0, options: { manual?: boolean } = {}) {
  container.exitCode = code;
  container.changedAt = Date.now();
  const policy = container.restart.split(":")[0];
  const restarts = !options.manual && RESTARTING_POLICIES.includes(policy) && (policy !== "on-failure" || code !== 0);
  container.status = restarts ? "restarting" : "exited";
  if (state.shell?.containerId === container.id) state.shell = null;
  if (!restarts && container.autoRemove) state.containers = state.containers.filter((other) => other.id !== container.id);
}

/** Les conteneurs en boucle de redémarrage repartent dès que leur dépendance devient joignable. */
export function reconcile(state: SimState, run: Runner) {
  for (const container of state.containers.filter((candidate) => candidate.status === "restarting")) {
    const plan = launchPlan(state, container, false, run);
    if (plan.type === "server") setRunning(container);
    else if (plan.type === "exit") container.output = plan.output;
  }
}

export function containerLogs(state: SimState, container: Container): string {
  if (container.output !== undefined) return container.output;
  if (container.kind === "app") {
    const lines = ["> node server.js"];
    for (const name of state.app.urlEnv) {
      const url = parseUrl(envValue(container.env, name));
      if (url) lines.push(`Connected to ${url.protocol.replace(":", "")} at ${url.hostname}:${url.port || defaultPort(url.protocol)}`);
    }
    lines.push(`Server listening on http://0.0.0.0:${state.app.port}`);
    return lines.join("\n");
  }
  return logsFor(container.kind, container);
}

// ─── Dépendances de l'application ──────────────────────────────────────────

function parseUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function defaultPort(protocol: string): string {
  return (
    { "postgres:": "5432", "postgresql:": "5432", "redis:": "6379", "mysql:": "3306", "mongodb:": "27017", "http:": "80" }[protocol] ?? "80"
  );
}

/** Conteneur joignable sous ce nom : même réseau défini par l'utilisateur (le réseau bridge n'a pas de DNS). */
export function resolveHost(state: SimState, from: Container, host: string): Container | undefined {
  return state.containers.find(
    (candidate) =>
      candidate !== from &&
      candidate.status === "running" &&
      (candidate.name === host || candidate.aliases.includes(host)) &&
      candidate.networks.some((network) => network !== "bridge" && from.networks.includes(network)),
  );
}

type Failure = { message: string; code: string; detail: string };

function appFailure(state: SimState, container: Container): Failure | undefined {
  for (const name of state.app.requiredEnv) {
    if (!envValue(container.env, name)) {
      return { message: `Missing required environment variable ${name}`, code: "ERR_MISSING_ENV", detail: `  variable: '${name}'` };
    }
  }
  for (const name of state.app.urlEnv) {
    const raw = envValue(container.env, name);
    if (!raw) continue;
    const url = parseUrl(raw);
    if (!url) return { message: `Invalid URL in ${name}`, code: "ERR_INVALID_URL", detail: `  input: '${raw}'` };
    const port = url.port || defaultPort(url.protocol);
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)) {
      return {
        message: `connect ECONNREFUSED 127.0.0.1:${port}`,
        code: "ECONNREFUSED",
        detail: `  address: '127.0.0.1',\n  port: ${port}`,
      };
    }
    const target = resolveHost(state, container, url.hostname);
    if (!target) {
      return {
        message: `getaddrinfo ENOTFOUND ${url.hostname}`,
        code: "ENOTFOUND",
        detail: `  syscall: 'getaddrinfo',\n  hostname: '${url.hostname}'`,
      };
    }
    const expectedPort = catalog[target.kind]?.exposed?.[0]?.split("/")[0];
    if (expectedPort && port !== expectedPort) {
      const address = ipAddress(
        state,
        target,
        target.networks.find((network) => container.networks.includes(network)),
      );
      return {
        message: `connect ECONNREFUSED ${address}:${port}`,
        code: "ECONNREFUSED",
        detail: `  address: '${address}',\n  port: ${port}`,
      };
    }
    if (target.kind === "postgres") {
      const password = envValue(target.env, "POSTGRES_PASSWORD");
      const user = decodeURIComponent(url.username || "postgres");
      if (decodeURIComponent(url.password) !== password || user !== (envValue(target.env, "POSTGRES_USER") ?? "postgres")) {
        return {
          message: `password authentication failed for user "${user}"`,
          code: "28P01",
          detail: `  severity: 'FATAL',\n  routine: 'auth_failed'`,
        };
      }
    }
  }
  return undefined;
}

function crashLog(failure: Failure): string {
  return `> node server.js

node:internal/process/promises:394
    triggerUncaughtException(err, true /* fromPromise */);
    ^

Error: ${failure.message}
    at Object.<anonymous> (/app/server.js:4:9)
    at Module._compile (node:internal/modules/cjs/loader:1546:14) {
  code: '${failure.code}',
${failure.detail}
}

Node.js v22.11.0`;
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
  if (container.status === "running")
    return `Up ${humanDuration(Date.now() - container.changedAt)}${container.healthcheck ? " (healthy)" : ""}`;
  if (container.status === "restarting") return `Restarting (${container.exitCode}) ${ago(container.changedAt)}`;
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
      Restarting: container.status === "restarting",
      ExitCode: container.exitCode,
      ...(container.healthcheck ? { Health: { Status: running ? "healthy" : "unhealthy", FailingStreak: 0 } } : {}),
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
      RestartPolicy: { Name: container.restart.split(":")[0], MaximumRetryCount: Number(container.restart.split(":")[1] ?? 0) },
      Memory: container.limits.memory ? memoryBytes(container.limits.memory) : 0,
      NanoCpus: container.limits.cpus ? Math.round(Number(container.limits.cpus) * 1e9) : 0,
      ReadonlyRootfs: container.readOnly,
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
      User: container.user ?? "",
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
            Aliases: network === "bridge" ? null : [...container.aliases, shortId(container.id)],
            IPAddress: running ? ipAddress(state, container, network) : "",
            Gateway: running ? ipAddress(state, container, network).replace(/\d+$/, "1") : "",
          },
        ]),
      ),
    },
  };
}

/** "256m", "1g", "512mb" → octets. */
export function memoryBytes(value: string): number {
  const match = value.toLowerCase().match(/^(\d+(?:\.\d+)?)([kmg]?)b?$/);
  if (!match) return 0;
  return Math.round(Number(match[1]) * { "": 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 }[match[2] as "" | "k" | "m" | "g"]);
}

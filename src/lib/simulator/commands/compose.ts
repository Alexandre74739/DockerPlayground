import { has } from "../args";
import { type CommandDef, fail, foreground, join, ok, type Outcome } from "../command";
import { ago, randomHex, table } from "../format";
import { containerLogs, createContainer, displayCommand, portsText, setExited, statusText } from "../runtime";
import { addImage, findImage, remoteImage } from "../state";
import type { ComposeProject, ComposeService, Container, SimState } from "../types";
import { execIn, startContainer } from "./containers";
import { pullImage } from "./images";

/** Docker Compose v2 (`docker compose`) sur le projet décrit dans la configuration de l'exercice. */

function project(state: SimState): ComposeProject | string {
  const compose = state.compose;
  if (!compose || state.files[`${state.cwd}/${compose.fileName}`] === undefined) return "no configuration file provided: not found";
  return compose;
}

const projectName = (state: SimState) => state.cwd.split("/").pop()!.toLowerCase();
const containerName = (state: SimState, service: string) => `${projectName(state)}-${service}-1`;
const serviceContainers = (state: SimState) => state.containers.filter((container) => container.compose?.project === projectName(state));

/** Services triés selon depends_on. */
function ordered(services: ComposeService[]): ComposeService[] {
  const result: ComposeService[] = [];
  const visit = (service: ComposeService) => {
    if (result.includes(service)) return;
    for (const dependency of service.dependsOn ?? []) {
      const found = services.find((candidate) => candidate.name === dependency);
      if (found) visit(found);
    }
    result.push(service);
  };
  services.forEach(visit);
  return result;
}

function progress(verb: string, items: [string, string][]): string {
  const width = Math.max(...items.map(([label]) => label.length));
  return [`[+] ${verb} ${items.length}/${items.length}`, ...items.map(([label, action]) => ` ✔ ${label.padEnd(width)}  ${action}`)].join(
    "\n",
  );
}

/** Préfixe « web-1  | » des journaux Compose. */
function prefixedLogs(containers: Container[]): string {
  const width = Math.max(...containers.map((container) => (container.compose?.service.length ?? 0) + 2));
  return containers
    .flatMap((container) =>
      containerLogs(container)
        .split("\n")
        .map((line) => `${`${container.compose!.service}-1`.padEnd(width)}  | ${line}`),
    )
    .join("\n");
}

function withProject(
  run: (state: SimState, compose: ComposeProject, parsed: Parameters<CommandDef["run"]>[0]["parsed"]) => Outcome,
): CommandDef["run"] {
  return ({ state, parsed }) => {
    const compose = project(state);
    return typeof compose === "string" ? fail(compose, 1) : run(state, compose, parsed);
  };
}

function buildService(state: SimState, service: ComposeService): string {
  const ref = `${projectName(state)}-${service.name}:latest`;
  const base = remoteImage(state, "node:22-alpine")!;
  addImage(state, {
    ...base,
    tags: [ref],
    kind: "app",
    cmd: ["node", "server.js"],
    workdir: "/app",
    exposed: ["3000/tcp"],
    createdAt: Date.now(),
    fs: Object.fromEntries(
      Object.entries(state.files)
        .filter(([path]) => path.startsWith(`${state.cwd}/`))
        .map(([path, content]) => [`/app${path.slice(state.cwd.length)}`, content]),
    ),
    size: base.size + 18_000_000,
  });
  return `[+] Building 6.2s (10/10) FINISHED${" ".repeat(30)}docker:${state.context}
 => [${service.name} internal] load build definition from Dockerfile          0.0s
 => [${service.name} 1/5] FROM docker.io/library/node:22-alpine               1.4s
 => [${service.name} 2/5] WORKDIR /app                                        0.1s
 => [${service.name} 3/5] COPY package*.json ./                               0.0s
 => [${service.name} 4/5] RUN npm install                                     4.2s
 => [${service.name} 5/5] COPY . .                                            0.1s
 => [${service.name}] exporting to image                                      0.2s
 => => naming to docker.io/library/${ref}                                    0.0s
 => [${service.name}] resolving provenance for metadata file                  0.0s`;
}

const up: CommandDef = {
  path: "compose up",
  spec: {
    usage: "docker compose up [OPTIONS] [SERVICE...]",
    description: "Create and start containers",
    options: [
      { names: ["-d", "--detach"], description: "Detached mode: Run containers in the background" },
      { names: ["--build"], description: "Build images before starting containers" },
      { names: ["--force-recreate"], description: "Recreate containers even if their configuration and image haven't changed" },
    ],
  },
  run: withProject((state, compose, parsed) => {
    const name = projectName(state);
    const outputs: string[] = [];
    const network = `${name}_default`;

    const pulls = compose.services.filter((service) => service.image && !findImage(state, service.image));
    for (const service of pulls) {
      const result = pullImage(state, service.image!, { quietTag: true });
      if (!result.image) return fail(`${service.name} Error ${result.output}`);
    }
    if (pulls.length)
      outputs.push(
        progress(
          "Running",
          pulls.map((service) => [service.name, "Pulled"]),
        ),
      );

    for (const service of compose.services.filter((candidate) => candidate.build)) {
      if (has(parsed, "--build") || !findImage(state, `${name}-${service.name}`)) outputs.push(buildService(state, service));
    }

    const items: [string, string][] = [];
    if (!state.networks.some((candidate) => candidate.name === network)) {
      state.networks.push({ id: randomHex(64), name: network, driver: "bridge", createdAt: Date.now() });
      items.push([`Network ${network}`, "Created"]);
    }
    for (const volume of compose.volumes) {
      const full = `${name}_${volume}`;
      if (!state.volumes.some((candidate) => candidate.name === full)) {
        state.volumes.push({ name: full, createdAt: Date.now(), compose: name });
        items.push([`Volume "${full}"`, "Created"]);
      }
    }

    const started: Container[] = [];
    for (const service of ordered(compose.services)) {
      const imageRef = service.image ?? `${name}-${service.name}`;
      const image = findImage(state, imageRef)!;
      const existingName = containerName(state, service.name);
      let container = state.containers.find((candidate) => candidate.name === existingName);
      const rebuilt = container && container.imageId !== image.id;
      if (container && (rebuilt || has(parsed, "--force-recreate"))) {
        state.containers = state.containers.filter((candidate) => candidate !== container);
        container = undefined;
      }
      if (container?.status === "running") {
        items.push([`Container ${existingName}`, "Running"]);
        started.push(container);
        continue;
      }
      const label = container ? "Started" : rebuilt ? "Recreated" : "Started";
      container ??= createContainer(state, {
        name: existingName,
        imageInput: imageRef,
        image,
        ports: (service.ports ?? []).map((port) => ({ host: port.split(":")[0], container: port.split(":").at(-1)! })),
        env: service.env,
        mounts: (service.volumes ?? []).map((spec) => {
          const [source, target] = spec.split(":");
          const isBind = /^[./]/.test(source);
          return {
            type: isBind ? "bind" : "volume",
            source: isBind ? `${state.cwd}/${source.replace(/^\.\//, "")}` : `${name}_${source}`,
            target,
            readOnly: false,
          };
        }),
        networks: [network],
        compose: { project: name, service: service.name },
      });
      startContainer(state, container, { detach: true, interactive: false });
      items.push([`Container ${existingName}`, label]);
      started.push(container);
    }
    outputs.push(progress("Running", items));

    if (has(parsed, "--detach")) return ok(outputs.join("\n"));
    return {
      out: join(
        ...outputs,
        `Attaching to ${started.map((container) => `${container.compose!.service}-1`).join(", ")}`,
        prefixedLogs(started),
      ),
      prompt: foreground((next) => {
        const stopping = next.containers.filter((container) => started.some((other) => other.id === container.id));
        stopping.forEach((container) => setExited(next, container, 0));
        return {
          out: join(
            "Gracefully stopping... (press Ctrl+C again to force)",
            progress(
              "Stopping",
              stopping.reverse().map((container) => [`Container ${container.name}`, "Stopped"]),
            ),
          ),
          code: 130,
        };
      }),
    };
  }),
};

const down: CommandDef = {
  path: "compose down",
  spec: {
    usage: "docker compose down [OPTIONS] [SERVICES]",
    description: "Stop and remove containers, networks",
    options: [
      {
        names: ["-v", "--volumes"],
        description:
          'Remove named volumes declared in the "volumes" section of the Compose file and anonymous volumes attached to containers',
      },
      {
        names: ["--rmi"],
        value: "string",
        description: 'Remove images used by services. "local" remove only images that don\'t have a custom tag ("local"|"all")',
      },
    ],
  },
  run: withProject((state, compose, parsed) => {
    const name = projectName(state);
    const items: [string, string][] = serviceContainers(state)
      .reverse()
      .map((container) => [`Container ${container.name}`, "Removed"]);
    state.containers = state.containers.filter((container) => container.compose?.project !== name);
    if (has(parsed, "--volumes")) {
      for (const volume of compose.volumes) {
        const full = `${name}_${volume}`;
        if (state.volumes.some((candidate) => candidate.name === full)) {
          state.volumes = state.volumes.filter((candidate) => candidate.name !== full);
          items.push([`Volume ${full}`, "Removed"]);
        }
      }
    }
    const network = `${name}_default`;
    if (state.networks.some((candidate) => candidate.name === network)) {
      state.networks = state.networks.filter((candidate) => candidate.name !== network);
      items.push([`Network ${network}`, "Removed"]);
    }
    return ok(items.length ? progress("Running", items) : "");
  }),
};

const psCommand: CommandDef = {
  path: "compose ps",
  spec: {
    usage: "docker compose ps [OPTIONS] [SERVICE...]",
    description: "List containers",
    options: [{ names: ["-a", "--all"], description: "Show all stopped containers (including those created by the run command)" }],
  },
  run: withProject((state, _compose, parsed) => {
    const list = serviceContainers(state).filter((container) => has(parsed, "--all") || container.status === "running");
    const rows = list.map((container) => [
      container.name,
      container.image,
      displayCommand(container),
      container.compose!.service,
      ago(container.createdAt),
      statusText(container),
      portsText(state, container),
    ]);
    return ok(table(["NAME", "IMAGE", "COMMAND", "SERVICE", "CREATED", "STATUS", "PORTS"], rows));
  }),
};

const logs: CommandDef = {
  path: "compose logs",
  spec: {
    usage: "docker compose logs [OPTIONS] [SERVICE...]",
    description: "View output from containers",
    options: [
      { names: ["-f", "--follow"], description: "Follow log output" },
      {
        names: ["-n", "--tail"],
        value: "string",
        description: 'Number of lines to show from the end of the logs for each container (default "all")',
      },
    ],
  },
  run: withProject((state, compose, parsed) => {
    const unknown = parsed.args.find((service) => !compose.services.some((candidate) => candidate.name === service));
    if (unknown) return fail(`no such service: ${unknown}`);
    const list = serviceContainers(state).filter((container) => !parsed.args.length || parsed.args.includes(container.compose!.service));
    const out = list.length ? prefixedLogs(list) : "";
    if (has(parsed, "--follow") && list.some((container) => container.status === "running"))
      return { out, prompt: foreground(() => ({ code: 0 })) };
    return ok(out);
  }),
};

const exec: CommandDef = {
  path: "compose exec",
  spec: {
    usage: "docker compose exec [OPTIONS] SERVICE COMMAND [ARGS...]",
    description: "Execute a command in a running container",
    minArgs: 2,
    stopAtFirstArg: true,
    options: [
      { names: ["-d", "--detach"], description: "Detached mode: Run command in the background" },
      { names: ["-T", "--no-TTY"], description: "Disable pseudo-TTY allocation. By default `docker compose exec` allocates a TTY" },
      { names: ["-u", "--user"], value: "string", description: "Run the command as this user" },
    ],
  },
  run: withProject((state, compose, parsed) => {
    const [service, ...argv] = parsed.args;
    if (!compose.services.some((candidate) => candidate.name === service)) return fail(`service "${service}" is not running`);
    const container = state.containers.find((candidate) => candidate.name === containerName(state, service));
    if (!container || container.status !== "running") return fail(`service "${service}" is not running`);
    return execIn(state, container, argv, !has(parsed, "--no-TTY"));
  }),
};

function lifecycle(path: "stop" | "start" | "restart", verb: string, description: string): CommandDef {
  return {
    path: `compose ${path}`,
    spec: { usage: `docker compose ${path} [OPTIONS] [SERVICE...]`, description },
    run: withProject((state) => {
      const list = serviceContainers(state);
      const items: [string, string][] = [];
      for (const container of path === "stop" ? [...list].reverse() : list) {
        if (path !== "start" && container.status === "running") setExited(state, container, 0);
        if (path !== "stop") startContainer(state, container, { detach: true, interactive: false });
        items.push([`Container ${container.name}`, path === "stop" ? "Stopped" : "Started"]);
      }
      return ok(items.length ? progress(verb, items) : "");
    }),
  };
}

const build: CommandDef = {
  path: "compose build",
  spec: { usage: "docker compose build [OPTIONS] [SERVICE...]", description: "Build or rebuild services" },
  run: withProject((state, compose) =>
    ok(
      compose.services
        .filter((service) => service.build)
        .map((service) => buildService(state, service))
        .join("\n"),
    ),
  ),
};

const config: CommandDef = {
  path: "compose config",
  spec: {
    usage: "docker compose config [OPTIONS] [SERVICE...]",
    description: "Parse, resolve and render compose file in canonical format",
  },
  run: withProject((state, compose) => ok(`name: ${projectName(state)}\n${state.files[`${state.cwd}/${compose.fileName}`]}`)),
};

export const composeCommands: CommandDef[] = [
  up,
  down,
  psCommand,
  logs,
  exec,
  lifecycle("stop", "Stopping", "Stop services"),
  lifecycle("start", "Running", "Start services"),
  lifecycle("restart", "Restarting", "Restart service containers"),
  build,
  config,
];

import { has, type Parsed } from "../args";
import { type CommandDef, type Ctx, fail, foreground, join, ok, type Outcome } from "../command";
import { type ComposeProject, type ComposeService, loadCompose, renderConfig } from "../compose-file";
import { ago, randomHex, table } from "../format";
import { containerLogs, createContainer, displayCommand, portsText, setExited, statusText } from "../runtime";
import { findImage } from "../state";
import type { Container, Mount, SimState } from "../types";
import { buildImage } from "./build";
import { execIn, startContainer } from "./containers";
import { pullImage } from "./images";

/** Docker Compose v2 (`docker compose`) à partir des vrais fichiers compose.yaml du projet. */

const containerName = (project: ComposeProject, service: string) => `${project.name}-${service}-1`;
const projectContainers = (state: SimState, project: ComposeProject) =>
  state.containers.filter((container) => container.compose?.project === project.name);
const imageName = (project: ComposeProject, service: ComposeService) => service.image ?? `${project.name}-${service.name}`;

/** Services triés selon depends_on. */
function ordered(services: ComposeService[]): ComposeService[] {
  const result: ComposeService[] = [];
  const visit = (service: ComposeService) => {
    if (result.includes(service)) return;
    for (const dependency of service.dependsOn) {
      const found = services.find((candidate) => candidate.name === dependency.service);
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
function prefixedLogs(state: SimState, containers: Container[]): string {
  const width = Math.max(...containers.map((container) => (container.compose?.service.length ?? 0) + 2));
  return containers
    .flatMap((container) =>
      containerLogs(state, container)
        .split("\n")
        .map((line) => `${`${container.compose!.service}-1`.padEnd(width)}  | ${line}`),
    )
    .join("\n");
}

function withProject(run: (state: SimState, project: ComposeProject, parsed: Parsed) => Outcome): CommandDef["run"] {
  return ({ state, parsed, compose }: Ctx) => {
    const project = loadCompose(state, compose ?? { files: [], profiles: [] });
    if ("error" in project) return fail(project.error);
    const outcome = run(state, project, parsed);
    return project.warnings.length ? { ...outcome, out: join(...project.warnings, outcome.out) } : outcome;
  };
}

function serviceMounts(project: ComposeProject, service: ComposeService): Mount[] {
  return service.volumes
    .filter((volume) => volume.includes(":"))
    .map((volume) => {
      const [source, target, mode] = volume.split(":");
      const bind = /^[./~]/.test(source);
      return {
        type: bind ? ("bind" as const) : ("volume" as const),
        source: bind ? `${project.dir}/${source.replace(/^\.\/?/, "")}`.replace(/\/$/, "") : `${project.name}_${source}`,
        target,
        readOnly: mode === "ro",
      };
    });
}

function buildService(state: SimState, project: ComposeProject, service: ComposeService) {
  return buildImage(state, {
    contextDir: service.build!.context,
    dockerfilePath: `${service.build!.context}/${service.build!.dockerfile}`,
    dockerfileName: service.build!.dockerfile,
    tags: [imageName(project, service)],
    label: service.name,
  });
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
      { names: ["--no-deps"], description: "Don't start linked services" },
    ],
  },
  run: withProject((state, project, parsed) => {
    const outputs: string[] = [];
    const network = `${project.name}_default`;
    const wanted = parsed.args.length ? project.services.filter((service) => parsed.args.includes(service.name)) : project.services;
    const unknown = parsed.args.find((name) => !project.services.some((service) => service.name === name));
    if (unknown) return fail(`no such service: ${unknown}`);
    const selected = has(parsed, "--no-deps")
      ? wanted
      : ordered(project.services).filter((service) =>
          wanted.some((candidate) => candidate === service || dependsTransitively(project, candidate, service.name)),
        );

    const pulls = selected.filter((service) => service.image && !service.build && !findImage(state, service.image));
    for (const service of pulls) {
      const result = pullImage(state, service.image!, { quietTag: true });
      if (!result.image)
        return fail(
          join(
            outputs.join("\n") || undefined,
            ` ✘ ${service.name} Error ${result.output}`,
            `Error response from daemon: ${result.output}`,
          ),
        );
    }
    if (pulls.length)
      outputs.push(
        progress(
          "Running",
          pulls.map((service) => [service.name, "Pulled"]),
        ),
      );

    for (const service of selected.filter((candidate) => candidate.build)) {
      if (!has(parsed, "--build") && findImage(state, imageName(project, service))) continue;
      const result = buildService(state, project, service);
      if (!result.ok)
        return fail(join(...outputs, result.output, `failed to solve: process "${service.name}" did not complete successfully`));
      outputs.push(result.output);
    }

    const items: [string, string][] = [];
    if (!state.networks.some((candidate) => candidate.name === network)) {
      state.networks.push({ id: randomHex(64), name: network, driver: "bridge", createdAt: Date.now() });
      items.push([`Network ${network}`, "Created"]);
    }
    for (const volume of project.volumes) {
      const full = `${project.name}_${volume}`;
      if (!state.volumes.some((candidate) => candidate.name === full)) {
        state.volumes.push({ name: full, createdAt: Date.now(), compose: project.name });
        items.push([`Volume "${full}"`, "Created"]);
      }
    }

    const started: Container[] = [];
    for (const service of selected) {
      const name = containerName(project, service.name);
      const image = findImage(state, imageName(project, service));
      if (!image) return fail(`service "${service.name}" refers to undefined image ${imageName(project, service)}`);

      // Conditions depends_on : la dépendance doit être démarrée, ou « healthy ».
      for (const dependency of service.dependsOn) {
        const target = state.containers.find((candidate) => candidate.name === containerName(project, dependency.service));
        if (!target) continue;
        if (dependency.condition === "service_healthy" && !target.healthcheck) {
          return fail(
            join(progress("Running", items), `dependency failed to start: container ${target.name} has no healthcheck configured`),
          );
        }
        if (target.status !== "running" && dependency.condition !== "service_completed_successfully") {
          return fail(join(progress("Running", items), `dependency failed to start: container ${target.name} exited (${target.exitCode})`));
        }
      }

      const mounts = serviceMounts(project, service);
      const ports = service.ports.map((port) => {
        const parts = port.split(":");
        return { host: parts.length > 1 ? parts.at(-2)! : String(32768 + items.length), container: parts.at(-1)! };
      });
      const configHash = JSON.stringify([
        image.id,
        service.env,
        service.ports,
        service.volumes,
        service.command,
        service.restart,
        service.healthcheck,
        service.user,
      ]);
      let container = state.containers.find((candidate) => candidate.name === name);
      let action = "Started";
      if (container && (container.compose?.configHash !== configHash || has(parsed, "--force-recreate"))) {
        state.containers = state.containers.filter((candidate) => candidate !== container);
        container = undefined;
        action = "Recreated";
      } else if (container?.status === "running") {
        items.push([`Container ${name}`, "Running"]);
        started.push(container);
        continue;
      }
      if (!container) {
        for (const mount of mounts.filter((candidate) => candidate.type === "volume")) {
          if (!state.volumes.some((volume) => volume.name === mount.source))
            state.volumes.push({ name: mount.source, createdAt: Date.now() });
        }
        container = createContainer(state, {
          name,
          imageInput: imageName(project, service),
          image,
          command: service.command,
          ports,
          env: service.env,
          mounts,
          networks: [network],
          aliases: [service.name],
          restart: service.restart,
          healthcheck: service.healthcheck || Boolean(image.healthcheck),
          user: service.user,
          compose: { project: project.name, service: service.name, configHash },
        });
      }
      startContainer(state, container, { detach: true, interactive: false });
      items.push([`Container ${name}`, action]);
      started.push(container);
    }
    if (items.length) outputs.push(progress("Running", items));

    if (has(parsed, "--detach")) return ok(outputs.join("\n"));
    return {
      out: join(
        ...outputs,
        `Attaching to ${started.map((container) => `${container.compose!.service}-1`).join(", ")}`,
        prefixedLogs(state, started),
      ),
      prompt: foreground((next) => {
        const stopping = next.containers.filter((container) => started.some((other) => other.id === container.id));
        stopping.forEach((container) => setExited(next, container, 0, { manual: true }));
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

function dependsTransitively(project: ComposeProject, service: ComposeService, target: string): boolean {
  return service.dependsOn.some((dependency) => {
    if (dependency.service === target) return true;
    const next = project.services.find((candidate) => candidate.name === dependency.service);
    return next ? dependsTransitively(project, next, target) : false;
  });
}

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
  run: withProject((state, project, parsed) => {
    const items: [string, string][] = projectContainers(state, project)
      .reverse()
      .map((container) => [`Container ${container.name}`, "Removed"]);
    state.containers = state.containers.filter((container) => container.compose?.project !== project.name);
    if (has(parsed, "--volumes")) {
      for (const volume of project.volumes) {
        const full = `${project.name}_${volume}`;
        if (state.volumes.some((candidate) => candidate.name === full)) {
          state.volumes = state.volumes.filter((candidate) => candidate.name !== full);
          items.push([`Volume ${full}`, "Removed"]);
        }
      }
    }
    const rmi = parsed.options.get("--rmi")?.at(-1);
    if (rmi) {
      for (const service of project.services.filter((candidate) => rmi === "all" || candidate.build)) {
        const image = findImage(state, imageName(project, service));
        if (image) {
          state.images = state.images.filter((candidate) => candidate !== image);
          items.push([`Image ${imageName(project, service)}`, "Removed"]);
        }
      }
    }
    const network = `${project.name}_default`;
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
  run: withProject((state, project, parsed) => {
    const list = projectContainers(state, project).filter(
      (container) => has(parsed, "--all") || container.status === "running" || container.status === "restarting",
    );
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
  run: withProject((state, project, parsed) => {
    const unknown = parsed.args.find((service) => !project.services.some((candidate) => candidate.name === service));
    if (unknown) return fail(`no such service: ${unknown}`);
    const list = projectContainers(state, project).filter(
      (container) => !parsed.args.length || parsed.args.includes(container.compose!.service),
    );
    const out = list.length ? prefixedLogs(state, list) : "";
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
  run: withProject((state, project, parsed) => {
    const [service, ...argv] = parsed.args;
    const container = state.containers.find((candidate) => candidate.name === containerName(project, service));
    if (!container || container.status !== "running") return fail(`service "${service}" is not running`);
    return execIn(state, container, argv, !has(parsed, "--no-TTY"));
  }),
};

function lifecycle(path: "stop" | "start" | "restart", verb: string, description: string): CommandDef {
  return {
    path: `compose ${path}`,
    spec: { usage: `docker compose ${path} [OPTIONS] [SERVICE...]`, description },
    run: withProject((state, project, parsed) => {
      const list = projectContainers(state, project).filter(
        (container) => !parsed.args.length || parsed.args.includes(container.compose!.service),
      );
      const items: [string, string][] = [];
      for (const container of path === "stop" ? [...list].reverse() : list) {
        if (path !== "start" && container.status !== "exited") setExited(state, container, 0, { manual: true });
        if (path !== "stop") startContainer(state, container, { detach: true, interactive: false });
        items.push([`Container ${container.name}`, path === "stop" ? "Stopped" : "Started"]);
      }
      return ok(items.length ? progress(verb, items) : "");
    }),
  };
}

const build: CommandDef = {
  path: "compose build",
  spec: {
    usage: "docker compose build [OPTIONS] [SERVICE...]",
    description: "Build or rebuild services",
    options: [{ names: ["--no-cache"], description: "Do not use cache when building the image" }],
  },
  run: withProject((state, project) => {
    const outputs: string[] = [];
    for (const service of project.services.filter((candidate) => candidate.build)) {
      const result = buildService(state, project, service);
      if (!result.ok) return fail(join(...outputs, result.output));
      outputs.push(result.output);
    }
    return ok(outputs.join("\n"));
  }),
};

const config: CommandDef = {
  path: "compose config",
  spec: {
    usage: "docker compose config [OPTIONS] [SERVICE...]",
    description: "Parse, resolve and render compose file in canonical format",
    options: [{ names: ["--services"], description: "Print the service names, one per line." }],
  },
  run: withProject((_state, project, parsed) => {
    if (has(parsed, "--services")) return ok(project.services.map((service) => service.name).join("\n"));
    return ok(renderConfig(project));
  }),
};

const imagesCommand: CommandDef = {
  path: "compose images",
  spec: { usage: "docker compose images [OPTIONS] [SERVICE...]", description: "List images used by the created containers" },
  run: withProject((state, project) =>
    ok(
      table(
        ["CONTAINER", "REPOSITORY", "TAG", "IMAGE ID", "SIZE"],
        projectContainers(state, project).map((container) => {
          const image = state.images.find((candidate) => candidate.id === container.imageId);
          const [repository, tag] = (image?.tags[0] ?? "<none>:<none>").split(":");
          return [container.name, repository, tag, container.imageId.slice(0, 12), image ? `${Math.round(image.size / 1e6)}MB` : ""];
        }),
      ),
    ),
  ),
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
  imagesCommand,
];

import { has, value } from "../args";
import { type CommandDef, confirm, fail, join, ok, type Outcome } from "../command";
import { humanSize, MB, table } from "../format";
import type { SimState } from "../types";
import { pruneImages } from "./images";

const VERSION = "27.3.1";

export const versionShort = `Docker version ${VERSION}, build ce12230`;

const version: CommandDef = {
  path: "version",
  spec: {
    usage: "docker version [OPTIONS]",
    description: "Show the Docker version information",
    maxArgs: 0,
    options: [{ names: ["-f", "--format"], value: "string", description: "Format output using a custom template" }],
  },
  run: ({ state, parsed }) => {
    if (value(parsed, "--format")?.includes(".Server.Version") || value(parsed, "--format")?.includes(".Client.Version"))
      return ok(VERSION);
    return ok(`Client:
 Version:           ${VERSION}
 API version:       1.47
 Go version:        go1.22.7
 Git commit:        ce12230
 Built:             Fri Sep 20 11:39:44 2024
 OS/Arch:           linux/amd64
 Context:           ${state.context}

Server: Docker Desktop 4.35.1 (173168)
 Engine:
  Version:          ${VERSION}
  API version:      1.47 (minimum version 1.24)
  Go version:       go1.22.7
  Git commit:       41ca978
  Built:            Fri Sep 20 11:41:19 2024
  OS/Arch:          linux/amd64
 containerd:
  Version:          1.7.21
 runc:
  Version:          1.1.13
 docker-init:
  Version:          0.19.0`);
  },
};

const info: CommandDef = {
  path: "system info",
  aliases: ["info"],
  spec: { usage: "docker info [OPTIONS]", description: "Display system-wide information", maxArgs: 0 },
  run: ({ state }) => {
    const count = (status: string) => state.containers.filter((container) => container.status === status).length;
    return ok(`Client:
 Version:    ${VERSION}
 Context:    ${state.context}
 Debug Mode: false
 Plugins:
  buildx: Docker Buildx (Docker Inc.)
    Version:  v0.17.1-desktop.1
  compose: Docker Compose (Docker Inc.)
    Version:  v2.29.7-desktop.1

Server:
 Containers: ${state.containers.length}
  Running: ${count("running")}
  Paused: 0
  Stopped: ${state.containers.length - count("running")}
 Images: ${state.images.length}
 Server Version: ${VERSION}
 Storage Driver: overlayfs
 Logging Driver: json-file
 Kernel Version: 6.10.14-linuxkit
 Operating System: Docker Desktop
 OSType: linux
 Architecture: x86_64
 CPUs: 8
 Total Memory: 7.66GiB
 Name: docker-desktop
 Docker Root Dir: /var/lib/docker
 Registry: https://index.docker.io/v1/${state.auth ? `\n Username: ${state.auth}` : ""}`);
  },
};

const df: CommandDef = {
  path: "system df",
  spec: {
    usage: "docker system df [OPTIONS]",
    description: "Show docker disk usage",
    maxArgs: 0,
    options: [{ names: ["-v", "--verbose"], description: "Show detailed information on space usage" }],
  },
  run: ({ state }) => {
    const used = new Set(state.containers.map((container) => container.imageId));
    const imageSize = state.images.reduce((sum, image) => sum + image.size, 0);
    const reclaimImages = state.images.filter((image) => !used.has(image.id)).reduce((sum, image) => sum + image.size, 0);
    const containerSize = state.containers.length * 1.1 * MB;
    const stopped = state.containers.filter((container) => container.status !== "running").length * 1.1 * MB;
    const mounted = new Set(
      state.containers.flatMap((container) => container.mounts.filter((mount) => mount.type === "volume").map((mount) => mount.source)),
    );
    const volumeSize = state.volumes.length * 60 * MB;
    const reclaimVolumes = state.volumes.filter((volume) => !mounted.has(volume.name)).length * 60 * MB;
    const percent = (part: number, whole: number) => (whole ? ` (${Math.round((part / whole) * 100)}%)` : "");
    return ok(
      table(
        ["TYPE", "TOTAL", "ACTIVE", "SIZE", "RECLAIMABLE"],
        [
          [
            "Images",
            String(state.images.length),
            String(state.images.filter((image) => used.has(image.id)).length),
            humanSize(imageSize),
            `${humanSize(reclaimImages)}${percent(reclaimImages, imageSize)}`,
          ],
          [
            "Containers",
            String(state.containers.length),
            String(state.containers.filter((container) => container.status === "running").length),
            humanSize(containerSize),
            `${humanSize(stopped)}${percent(stopped, containerSize)}`,
          ],
          [
            "Local Volumes",
            String(state.volumes.length),
            String(mounted.size),
            humanSize(volumeSize),
            `${humanSize(reclaimVolumes)}${percent(reclaimVolumes, volumeSize)}`,
          ],
          ["Build Cache", String(Math.round(state.buildCache / (20 * MB))), "0", humanSize(state.buildCache), humanSize(state.buildCache)],
        ],
      ),
    );
  },
};

const prune: CommandDef = {
  path: "system prune",
  spec: {
    usage: "docker system prune [OPTIONS]",
    description: "Remove unused data",
    maxArgs: 0,
    options: [
      { names: ["-a", "--all"], description: "Remove all unused images not just dangling ones" },
      { names: ["-f", "--force"], description: "Do not prompt for confirmation" },
      { names: ["--volumes"], description: "Prune anonymous volumes" },
    ],
  },
  run: ({ state, parsed }) => {
    const all = has(parsed, "--all");
    const action = (current: SimState): Outcome => {
      const containers = current.containers.filter((container) => container.status !== "running");
      current.containers = current.containers.filter((container) => container.status === "running");
      const networks = current.networks.filter(
        (network) => !network.builtin && !current.containers.some((container) => container.networks.includes(network.name)),
      );
      current.networks = current.networks.filter((network) => !networks.includes(network));
      const images = pruneImages(current, all);
      const cache = current.buildCache;
      current.buildCache = 0;
      const total = images.space + cache + containers.length * 1.1 * MB;
      return ok(
        join(
          containers.length ? `Deleted Containers:\n${containers.map((container) => container.id).join("\n")}\n` : undefined,
          networks.length ? `Deleted Networks:\n${networks.map((network) => network.name).join("\n")}\n` : undefined,
          images.lines.length ? `Deleted Images:\n${images.lines.join("\n")}\n` : undefined,
          cache
            ? `Deleted build cache objects:\n${Array.from({ length: 3 }, (_, index) => `${index}k1x2m3n4o5p6q7r8s9t0u1v`).join("\n")}\n`
            : undefined,
          `Total reclaimed space: ${humanSize(total)}`,
        ),
      );
    };
    if (has(parsed, "--force")) return action(state);
    const warning = [
      "WARNING! This will remove:",
      "  - all stopped containers",
      "  - all networks not used by at least one container",
      has(parsed, "--volumes") ? "  - all anonymous volumes not used by at least one container" : undefined,
      all ? "  - all images without at least one container associated to them" : "  - all dangling images",
      "  - unused build cache",
      "",
    ].filter((line) => line !== undefined);
    return { out: warning.join("\n"), prompt: confirm(action) };
  },
};

const contextLs: CommandDef = {
  path: "context ls",
  aliases: ["context list"],
  spec: {
    usage: "docker context ls [OPTIONS]",
    description: "List contexts",
    maxArgs: 0,
    options: [{ names: ["-q", "--quiet"], description: "Only show context names" }],
  },
  run: ({ state, parsed }) => {
    const names = Object.keys(state.contexts);
    if (has(parsed, "--quiet")) return ok(names.join("\n"));
    return ok(
      table(
        ["NAME", "DESCRIPTION", "DOCKER ENDPOINT", "ERROR"],
        names.map((name) => [
          `${name}${name === state.context ? " *" : ""}`,
          state.contexts[name].description,
          state.contexts[name].endpoint,
          "",
        ]),
      ),
    );
  },
};

const notFound = (state: SimState, name: string) =>
  fail(`context "${name}": context not found: open /home/${state.user}/.docker/contexts/meta/${name}/meta.json: no such file or directory`);

const contextUse: CommandDef = {
  path: "context use",
  spec: { usage: "docker context use CONTEXT", description: "Set the current docker context", minArgs: 1, maxArgs: 1 },
  run: ({ state, parsed }) => {
    const name = parsed.args[0];
    if (!state.contexts[name]) return notFound(state, name);
    state.context = name;
    return ok(`${name}\nCurrent context is now "${name}"`);
  },
};

const contextShow: CommandDef = {
  path: "context show",
  spec: { usage: "docker context show", description: "Print the name of the current context", maxArgs: 0 },
  run: ({ state }) => ok(state.context),
};

const contextCreate: CommandDef = {
  path: "context create",
  spec: {
    usage: "docker context create [OPTIONS] CONTEXT",
    description: "Create a context",
    minArgs: 1,
    maxArgs: 1,
    options: [
      { names: ["--description"], value: "string", description: "Description of the context" },
      { names: ["--docker"], value: "stringToString", description: "set the docker endpoint (default [])" },
    ],
  },
  run: ({ state, parsed }) => {
    const name = parsed.args[0];
    if (state.contexts[name]) return fail(`context "${name}" already exists`);
    const host = value(parsed, "--docker")?.match(/host=([^,]+)/)?.[1];
    if (!host) return fail('docker endpoint configuration is required (exemple : --docker "host=ssh://user@serveur")');
    if (!/^(ssh|tcp|unix):\/\//.test(host)) return fail(`unable to parse docker host \`${host}\``);
    state.contexts[name] = { description: value(parsed, "--description") ?? "", endpoint: host };
    return ok(`${name}\nSuccessfully created context "${name}"`);
  },
};

const contextRm: CommandDef = {
  path: "context rm",
  aliases: ["context remove"],
  spec: {
    usage: "docker context rm CONTEXT [CONTEXT...]",
    description: "Remove one or more contexts",
    minArgs: 1,
    options: [{ names: ["-f", "--force"], description: "Force the removal of a context in use" }],
  },
  run: ({ state, parsed }) => {
    for (const name of parsed.args) {
      if (!state.contexts[name]) return notFound(state, name);
      if (name === "default") return fail("default context cannot be removed");
      if (name === state.context && !has(parsed, "--force")) {
        return fail(
          `failed to remove context ${name}: failed to remove metadata: context "${name}" is in use, set -f flag to force remove`,
        );
      }
      delete state.contexts[name];
      if (name === state.context) state.context = "default";
    }
    return ok(parsed.args.join("\n"));
  },
};

const contextInspect: CommandDef = {
  path: "context inspect",
  spec: {
    usage: "docker context inspect [OPTIONS] [CONTEXT] [CONTEXT...]",
    description: "Display detailed information on one or more contexts",
  },
  run: ({ state, parsed }) => {
    const names = parsed.args.length ? parsed.args : [state.context];
    const missing = names.find((name) => !state.contexts[name]);
    if (missing) return notFound(state, missing);
    return ok(
      JSON.stringify(
        names.map((name) => ({
          Name: name,
          Metadata: { Description: state.contexts[name].description },
          Endpoints: { docker: { Host: state.contexts[name].endpoint, SkipTLSVerify: false } },
        })),
        null,
        4,
      ),
    );
  },
};

export const systemCommands: CommandDef[] = [
  version,
  info,
  df,
  prune,
  contextLs,
  contextUse,
  contextShow,
  contextCreate,
  contextRm,
  contextInspect,
];

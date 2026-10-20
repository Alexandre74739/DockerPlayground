import { has, values } from "../args";
import { type CommandDef, confirm, daemonError, fail, join, ok, type Outcome } from "../command";
import { ago, humanSize, json, randomHex, shortId, table } from "../format";
import { addImage, findImage, isValidReference, parseImageRef, pullError, remoteImage } from "../state";
import type { Image, SimState } from "../types";
import { buildCommand } from "./build";

export function layerIds(seed: string, count: number): string[] {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return Array.from({ length: count }, (_, index) => ((hash * (index + 7)) >>> 0).toString(16).padStart(8, "0").slice(0, 8) + "c4e1");
}

export type PullResult = { image?: Image; output: string; ref: string };

/** Télécharge une image depuis le Hub simulé. */
export function pullImage(state: SimState, input: string, options: { quietTag?: boolean } = {}): PullResult {
  const { repo, tag, full } = parseImageRef(input);
  const remote = remoteImage(state, input);
  if (!remote) return { output: pullError(input), ref: full };
  const library = repo.includes("/") ? repo : `library/${repo}`;
  const layers = layerIds(full, Math.min(6, Math.max(1, remote.history.length - 2)));
  const digest = `sha256:${randomHex(64)}`;
  const existing = findImage(state, full);
  const lines = [
    !options.quietTag && !input.includes(":") ? "Using default tag: latest" : undefined,
    `${tag}: Pulling from ${library}`,
    ...(existing ? [] : layers.map((layer) => `${layer}: Pull complete`)),
    `Digest: ${digest}`,
    existing ? `Status: Image is up to date for ${full}` : `Status: Downloaded newer image for ${full}`,
  ];
  const image = existing ?? addImage(state, remote);
  if (!options.quietTag) lines.push(`docker.io/${library}:${tag}`);
  return { image, output: join(...lines), ref: full };
}

export function inspectImage(image: Image) {
  return {
    Id: `sha256:${image.id}`,
    RepoTags: image.tags,
    RepoDigests: image.tags.map((tag) => `${parseImageRef(tag).repo}@sha256:${image.id.split("").reverse().join("")}`),
    Created: new Date(image.createdAt).toISOString(),
    Config: {
      Env: image.env,
      Cmd: image.cmd,
      WorkingDir: image.workdir === "/" ? "" : image.workdir,
      ExposedPorts: Object.fromEntries(image.exposed.map((port) => [port, {}])),
    },
    Architecture: "amd64",
    Os: "linux",
    Size: Math.round(image.size),
    RootFS: { Type: "layers", Layers: layerIds(image.id, 3).map((layer) => `sha256:${layer}${image.id.slice(12, 64)}`) },
  };
}

const pull: CommandDef = {
  path: "image pull",
  aliases: ["pull"],
  spec: {
    usage: "docker pull [OPTIONS] NAME[:TAG|@DIGEST]",
    description: "Download an image from a registry",
    minArgs: 1,
    maxArgs: 1,
    options: [
      { names: ["-a", "--all-tags"], description: "Download all tagged images in the repository" },
      { names: ["--platform"], value: "string", description: "Set platform if server is multi-platform capable" },
      { names: ["-q", "--quiet"], description: "Suppress verbose output" },
    ],
  },
  run: ({ state, parsed }) => {
    const input = parsed.args[0];
    if (!isValidReference(input)) return fail(`invalid reference format`);
    const result = pullImage(state, input);
    if (!result.image) return daemonError(result.output);
    return ok(has(parsed, "--quiet") ? `docker.io/${result.ref}` : result.output);
  },
};

function imageRows(images: Image[]): string[][] {
  return images
    .sort((a, b) => b.createdAt - a.createdAt)
    .flatMap((image) => {
      const refs = image.tags.length ? image.tags : ["<none>:<none>"];
      return refs.map((ref) => {
        const index = ref.lastIndexOf(":");
        return [ref.slice(0, index), ref.slice(index + 1), shortId(image.id), ago(image.createdAt), humanSize(image.size)];
      });
    });
}

const images: CommandDef = {
  path: "image ls",
  aliases: ["images", "image list"],
  spec: {
    usage: "docker images [OPTIONS] [REPOSITORY[:TAG]]",
    description: "List images",
    maxArgs: 1,
    options: [
      { names: ["-a", "--all"], description: "Show all images (default hides intermediate images)" },
      { names: ["-f", "--filter"], value: "filter", description: "Filter output based on conditions provided" },
      { names: ["-q", "--quiet"], description: "Only show image IDs" },
    ],
  },
  run: ({ state, parsed }) => {
    let list = [...state.images];
    const [filterRepo] = parsed.args;
    if (filterRepo) {
      const { repo, tag } = parseImageRef(filterRepo);
      list = list.filter((image) =>
        image.tags.some((ref) => ref.startsWith(`${repo}:`) && (!filterRepo.includes(":") || ref === `${repo}:${tag}`)),
      );
    }
    if (values(parsed, "--filter").includes("dangling=true")) list = list.filter((image) => image.tags.length === 0);
    if (has(parsed, "--quiet")) return ok([...new Set(list.map((image) => shortId(image.id)))].join("\n"));
    return ok(table(["REPOSITORY", "TAG", "IMAGE ID", "CREATED", "SIZE"], imageRows(list)));
  },
};

const imageInspect: CommandDef = {
  path: "image inspect",
  spec: {
    usage: "docker image inspect [OPTIONS] IMAGE [IMAGE...]",
    description: "Display detailed information on one or more images",
    minArgs: 1,
    options: [{ names: ["-f", "--format"], value: "string", description: "Format output using a custom template" }],
  },
  run: ({ state, parsed }) => {
    const found = [];
    for (const name of parsed.args) {
      const image = findImage(state, name);
      if (!image) return fail(`[]\nError response from daemon: No such image: ${parseImageRef(name).full}`);
      found.push(inspectImage(image));
    }
    return ok(json(found));
  },
};

const tag: CommandDef = {
  path: "image tag",
  aliases: ["tag"],
  spec: {
    usage: "docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]",
    description: "Create a tag TARGET_IMAGE that refers to SOURCE_IMAGE",
    minArgs: 2,
    maxArgs: 2,
  },
  run: ({ state, parsed }) => {
    const [source, target] = parsed.args;
    const image = findImage(state, source);
    if (!image) return daemonError(`No such image: ${parseImageRef(source).full}`);
    if (!isValidReference(target))
      return fail(`Error parsing reference: "${target}" is not a valid repository/tag: invalid reference format`);
    const ref = parseImageRef(target).full;
    for (const other of state.images) other.tags = other.tags.filter((existing) => existing !== ref);
    image.tags.push(ref);
    return ok();
  },
};

const rmi: CommandDef = {
  path: "image rm",
  aliases: ["rmi", "image remove"],
  spec: {
    usage: "docker rmi [OPTIONS] IMAGE [IMAGE...]",
    description: "Remove one or more images",
    minArgs: 1,
    options: [{ names: ["-f", "--force"], description: "Force removal of the image" }],
  },
  run: ({ state, parsed }) => {
    const lines: string[] = [];
    let code = 0;
    for (const name of parsed.args) {
      const image = findImage(state, name);
      if (!image) {
        lines.push(`Error response from daemon: No such image: ${/^[0-9a-f]+$/.test(name) ? name : parseImageRef(name).full}`);
        code = 1;
        continue;
      }
      const byId = image.id.startsWith(name) && !image.tags.includes(parseImageRef(name).full);
      const ref = parseImageRef(name).full;
      if (!byId && image.tags.length > 1) {
        image.tags = image.tags.filter((existing) => existing !== ref);
        lines.push(`Untagged: ${ref}`);
        continue;
      }
      if (byId && image.tags.length > 1 && !has(parsed, "--force")) {
        lines.push(
          `Error response from daemon: conflict: unable to delete ${shortId(image.id)} (must be forced) - image is referenced in multiple repositories`,
        );
        code = 1;
        continue;
      }
      const user = state.containers.find((container) => container.imageId === image.id);
      if (user && !has(parsed, "--force")) {
        lines.push(
          byId
            ? `Error response from daemon: conflict: unable to delete ${shortId(image.id)} (must be forced) - image is being used by stopped container ${shortId(user.id)}`
            : `Error response from daemon: conflict: unable to remove repository reference "${name}" (must force) - container ${shortId(user.id)} is using its referenced image ${shortId(image.id)}`,
        );
        code = 1;
        continue;
      }
      lines.push(...image.tags.flatMap((existing) => [`Untagged: ${existing}`]), `Deleted: sha256:${image.id}`);
      state.images = state.images.filter((other) => other.id !== image.id);
    }
    return { out: lines.join("\n"), code };
  },
};

const history: CommandDef = {
  path: "image history",
  aliases: ["history"],
  spec: {
    usage: "docker history [OPTIONS] IMAGE",
    description: "Show the history of an image",
    minArgs: 1,
    maxArgs: 1,
    options: [{ names: ["--no-trunc"], description: "Don't truncate output" }],
  },
  run: ({ state, parsed }) => {
    const image = findImage(state, parsed.args[0]);
    if (!image) return daemonError(`No such image: ${parseImageRef(parsed.args[0]).full}`);
    const rows = image.history.map((layer, index) => [
      index === 0 ? shortId(image.id) : "<missing>",
      ago(image.createdAt),
      has(parsed, "--no-trunc") ? layer.createdBy : layer.createdBy.length > 45 ? `${layer.createdBy.slice(0, 44)}…` : layer.createdBy,
      humanSize(layer.size),
      index === image.history.length - 1 ? "debuerreotype 0.15" : "buildkit.dockerfile.v0",
    ]);
    return ok(table(["IMAGE", "CREATED", "CREATED BY", "SIZE", "COMMENT"], rows));
  },
};

/** Supprime les images inutilisées (toutes avec `all`, sinon les pendantes). */
export function pruneImages(state: SimState, all: boolean): { lines: string[]; space: number } {
  const used = new Set(state.containers.map((container) => container.imageId));
  const removed = state.images.filter((image) => !used.has(image.id) && (all || image.tags.length === 0));
  state.images = state.images.filter((image) => !removed.includes(image));
  return {
    lines: removed.flatMap((image) => [...image.tags.map((ref) => `untagged: ${ref}`), `deleted: sha256:${image.id}`]),
    space: removed.reduce((sum, image) => sum + image.size, 0),
  };
}

const imagePrune: CommandDef = {
  path: "image prune",
  spec: {
    usage: "docker image prune [OPTIONS]",
    description: "Remove unused images",
    maxArgs: 0,
    options: [
      { names: ["-a", "--all"], description: "Remove all unused images, not just dangling ones" },
      { names: ["-f", "--force"], description: "Do not prompt for confirmation" },
    ],
  },
  run: ({ state, parsed }) => {
    const all = has(parsed, "--all");
    const action = (current: SimState): Outcome => {
      const { lines, space } = pruneImages(current, all);
      return ok(join(lines.length ? `Deleted Images:\n${lines.join("\n")}\n` : undefined, `Total reclaimed space: ${humanSize(space)}`));
    };
    if (has(parsed, "--force")) return action(state);
    const warning = all
      ? "WARNING! This will remove all images without at least one container associated to them."
      : "WARNING! This will remove all dangling images.";
    return { out: warning, prompt: confirm(action) };
  },
};

export const imageCommands: CommandDef[] = [pull, images, imageInspect, tag, rmi, history, imagePrune, buildCommand];

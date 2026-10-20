import { catalog, PUBLISHED_AGO } from "./catalog";
import { DAY, HOUR, MB, randomHex } from "./format";
import type { ComposeProject, Container, FileSystem, Image, ImageKind, Network, SimState } from "./types";

export const HOME = "/home/alex";
export const PROJECT_DIR = `${HOME}/projet`;

// ─── Références d'images ────────────────────────────────────────────────────

export type ImageRef = { repo: string; tag: string; full: string };

export function parseImageRef(input: string): ImageRef {
  const withoutRegistry = input.replace(/^docker\.io\/(library\/)?/, "");
  const lastColon = withoutRegistry.lastIndexOf(":");
  const hasTag = lastColon > withoutRegistry.lastIndexOf("/");
  const repo = hasTag ? withoutRegistry.slice(0, lastColon) : withoutRegistry;
  const tag = hasTag ? withoutRegistry.slice(lastColon + 1) : "latest";
  return { repo, tag, full: `${repo}:${tag}` };
}

export function isValidReference(input: string): boolean {
  return /^[a-z0-9]+([._-][a-z0-9]+)*(\/[a-z0-9]+([._-][a-z0-9]+)*)*(:[\w][\w.-]{0,127})?$/.test(input);
}

/** Retrouve une image locale par référence ou par (préfixe d')ID. */
export function findImage(state: SimState, input: string): Image | undefined {
  const { full } = parseImageRef(input);
  return (
    state.images.find((image) => image.tags.includes(full)) ??
    (/^[0-9a-f]{4,64}$/.test(input) ? state.images.find((image) => image.id.startsWith(input)) : undefined)
  );
}

export function findContainer(state: SimState, nameOrId: string): Container | undefined {
  return (
    state.containers.find((container) => container.name === nameOrId) ??
    (nameOrId.length >= 1 ? state.containers.find((container) => container.id.startsWith(nameOrId)) : undefined)
  );
}

/** Image du « Hub » simulé correspondant à une référence, si elle existe. */
export function remoteImage(state: SimState, input: string): Omit<Image, "id"> | undefined {
  const { repo, tag, full } = parseImageRef(input);
  const entry = catalog[repo];
  if (entry && isKnownTag(tag)) {
    const alpine = tag.includes("alpine");
    return {
      tags: [full],
      size: alpine && entry.alpineSize ? entry.alpineSize : entry.size,
      createdAt: Date.now() - PUBLISHED_AGO,
      kind: entry.kind,
      alpine,
      cmd: entry.cmd,
      workdir: entry.workdir ?? "/",
      exposed: entry.exposed ?? [],
      env: entry.env ?? [],
      fs: { ...entry.fs },
      history: entry.layers.map((createdBy, index) => ({ createdBy, size: index === entry.layers.length - 1 ? entry.size : 0 })),
    };
  }
  const published = state.hub[repo];
  if (published?.includes(tag)) {
    const local = findImage(state, full);
    if (local) return { ...local, tags: [full] };
    return {
      tags: [full],
      size: 162 * MB,
      createdAt: Date.now() - DAY,
      kind: "app",
      alpine: true,
      cmd: ["node", "server.js"],
      workdir: "/app",
      exposed: ["3000/tcp"],
      env: [],
      fs: {},
      history: [],
    };
  }
  return undefined;
}

/** Tags plausibles pour une image officielle (latest, alpine, 22-alpine, 1.27.2…). */
export function isKnownTag(tag: string): boolean {
  return /^(latest|lts|alpine|slim|bookworm|bullseye|noble|jammy|stable|mainline)([-.][\w]+)*$|^\d+(\.\d+)*([-.][\w]+)*$/.test(tag);
}

/** Message d'erreur de la vraie CLI quand une image n'existe pas sur le registre. */
export function pullError(input: string): string {
  const { repo, tag } = parseImageRef(input);
  if (catalog[repo]) return `manifest for ${repo}:${tag} not found: manifest unknown: manifest unknown`;
  return `pull access denied for ${repo}, repository does not exist or may require 'docker login': denied: requested access to the resource is denied`;
}

export function addImage(state: SimState, image: Omit<Image, "id"> & { id?: string }): Image {
  const created: Image = { ...image, id: image.id ?? randomHex(64) };
  for (const tag of created.tags) {
    for (const other of state.images) other.tags = other.tags.filter((existing) => existing !== tag);
  }
  state.images.push(created);
  return created;
}

// ─── Noms de conteneurs ─────────────────────────────────────────────────────

const ADJECTIVES = ["eager", "brave", "quirky", "focused", "jolly", "nostalgic", "vibrant", "zen", "sharp", "gifted"];
const NAMES = ["turing", "hopper", "lovelace", "curie", "tesla", "darwin", "hypatia", "knuth", "ritchie", "torvalds"];

export function generateName(state: SimState): string {
  for (;;) {
    const name = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]}_${NAMES[Math.floor(Math.random() * NAMES.length)]}`;
    if (!state.containers.some((container) => container.name === name)) return name;
  }
}

// ─── Système de fichiers de l'hôte ─────────────────────────────────────────

export function resolvePath(cwd: string, path: string): string {
  const absolute = path.startsWith("/") ? path : path === "~" || path.startsWith("~/") ? HOME + path.slice(1) : `${cwd}/${path}`;
  const parts: string[] = [];
  for (const part of absolute.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return `/${parts.join("/")}`;
}

export function isDirectory(fs: FileSystem, dirs: string[], path: string): boolean {
  if (path === "/" || dirs.includes(path)) return true;
  return Object.keys(fs).some((file) => file.startsWith(`${path}/`));
}

export function listDirectory(fs: FileSystem, dirs: string[], path: string): string[] {
  const prefix = path === "/" ? "/" : `${path}/`;
  const entries = new Set<string>();
  for (const candidate of [...Object.keys(fs), ...dirs]) {
    if (candidate.startsWith(prefix) && candidate !== path) entries.add(candidate.slice(prefix.length).split("/")[0]);
  }
  return [...entries].sort();
}

export function displayPath(path: string): string {
  return path === HOME ? "~" : path.startsWith(`${HOME}/`) ? `~${path.slice(HOME.length)}` : path;
}

// ─── Configuration initiale d'un exercice ──────────────────────────────────

export type ContainerSetup = {
  name: string;
  image: string;
  status?: "running" | "exited";
  ports?: string[];
  env?: string[];
  /** Fichiers supplémentaires présents dans le conteneur. */
  fs?: FileSystem;
};

export type CustomImageSetup = {
  ref: string;
  kind?: ImageKind;
  base?: string;
  cmd?: string[];
  workdir?: string;
  exposed?: string[];
  fs?: FileSystem;
  size?: number;
};

export type SimulatorSetup = {
  /** Images officielles déjà téléchargées (ex: "nginx", "node:22-alpine"). */
  images?: string[];
  customImages?: CustomImageSetup[];
  danglingImages?: number;
  containers?: ContainerSetup[];
  volumes?: string[];
  networks?: string[];
  /** Fichiers du dossier ~/projet (chemins relatifs). */
  files?: FileSystem;
  dirs?: string[];
  auth?: string;
  buildCache?: number;
  compose?: ComposeProject;
  /** Contexte Docker actif (desktop-linux par défaut). */
  context?: string;
};

const BUILTIN_NETWORKS: Network[] = [
  { id: randomHex(64), name: "bridge", driver: "bridge", createdAt: Date.now() - 30 * DAY, builtin: true },
  { id: randomHex(64), name: "host", driver: "host", createdAt: Date.now() - 30 * DAY, builtin: true },
  { id: randomHex(64), name: "none", driver: "null", createdAt: Date.now() - 30 * DAY, builtin: true },
];

export function createState(setup: SimulatorSetup = {}): SimState {
  const state: SimState = {
    user: "alex",
    hostname: "pc",
    cwd: PROJECT_DIR,
    files: {},
    dirs: [HOME, PROJECT_DIR, ...(setup.dirs ?? []).map((dir) => resolvePath(PROJECT_DIR, dir))],
    images: [],
    containers: [],
    volumes: [],
    networks: structuredClone(BUILTIN_NETWORKS),
    shell: null,
    auth: setup.auth ?? null,
    context: setup.context ?? "desktop-linux",
    buildCache: setup.buildCache ?? 0,
    hub: {},
    compose: setup.compose ?? null,
  };

  for (const [path, content] of Object.entries(setup.files ?? {})) state.files[resolvePath(PROJECT_DIR, path)] = content;

  for (const ref of setup.images ?? []) {
    const remote = remoteImage(state, ref);
    if (remote) addImage(state, remote);
  }
  for (const custom of setup.customImages ?? []) {
    const base = custom.base ? remoteImage(state, custom.base) : undefined;
    addImage(state, {
      tags: [parseImageRef(custom.ref).full],
      size: custom.size ?? (base?.size ?? 150 * MB) + 12 * MB,
      createdAt: Date.now() - 2 * HOUR,
      kind: custom.kind ?? "app",
      alpine: base?.alpine ?? true,
      cmd: custom.cmd ?? ["node", "server.js"],
      workdir: custom.workdir ?? "/app",
      exposed: custom.exposed ?? ["3000/tcp"],
      env: base?.env ?? [],
      fs: { ...base?.fs, ...custom.fs },
      history: [{ createdBy: `CMD ${JSON.stringify(custom.cmd ?? ["node", "server.js"])}`, size: 0 }],
    });
  }
  for (let i = 0; i < (setup.danglingImages ?? 0); i++) {
    addImage(state, { ...(remoteImage(state, "node:22-alpine") as Omit<Image, "id">), tags: [], size: (160 + i * 3) * MB, kind: "app" });
  }
  for (const name of setup.volumes ?? []) state.volumes.push({ name, createdAt: Date.now() - DAY });
  for (const name of setup.networks ?? []) {
    state.networks.push({ id: randomHex(64), name, driver: "bridge", createdAt: Date.now() - DAY });
  }
  for (const spec of setup.containers ?? []) {
    let image = findImage(state, spec.image);
    if (!image) {
      const remote = remoteImage(state, spec.image);
      if (!remote) throw new Error(`Image inconnue dans la configuration : ${spec.image}`);
      image = addImage(state, remote);
    }
    const createdAt = Date.now() - 2 * HOUR;
    state.containers.push({
      id: randomHex(64),
      name: spec.name,
      image: spec.image,
      imageId: image.id,
      command: image.cmd,
      status: spec.status ?? "running",
      exitCode: 0,
      createdAt,
      changedAt: spec.status === "exited" ? createdAt + 1000 : createdAt,
      ports: (spec.ports ?? []).map((port) => {
        const [host, container] = port.split(":");
        return { host, container };
      }),
      env: [...image.env, ...(spec.env ?? [])],
      mounts: [],
      networks: ["bridge"],
      autoRemove: false,
      fs: { ...image.fs, ...spec.fs },
      kind: image.kind,
      alpine: image.alpine,
    });
  }
  return state;
}

export function cloneState(state: SimState): SimState {
  return structuredClone(state);
}

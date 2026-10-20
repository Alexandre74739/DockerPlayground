import { catalog, PUBLISHED_AGO } from "./catalog";
import { DAY, HOUR, MB, randomHex } from "./format";
import { buildContainer } from "./container";
import type { AppBehavior, Container, FileSystem, Image, ImageKind, MachineData, Network, SimState } from "./types";

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
      size: alpine && entry.alpineSize ? entry.alpineSize : tag.includes("slim") && entry.slimSize ? entry.slimSize : entry.size,
      createdAt: Date.now() - PUBLISHED_AGO,
      kind: entry.kind,
      alpine,
      cmd: entry.cmd,
      workdir: entry.workdir ?? "/",
      exposed: entry.exposed ?? [],
      env: entry.env ?? [],
      slim: tag.includes("slim"),
      base: full,
      platforms: ["linux/amd64", "linux/arm64"],
      fs: { ...entry.fs },
      history: entry.layers.map((createdBy, index) => ({ createdBy, size: index === entry.layers.length - 1 ? entry.size : 0 })),
    };
  }
  const published = state.hub[repo]?.tags[tag];
  if (published && canPull(state, repo)) {
    if (published.image) return { ...structuredClone(published.image), tags: [full] };
    return {
      tags: [full],
      size: 162 * MB,
      createdAt: published.pushedAt,
      kind: "app",
      alpine: true,
      base: "node:22-alpine",
      cmd: ["node", "server.js"],
      workdir: "/app",
      exposed: ["3000/tcp"],
      env: [],
      user: "node",
      platforms: published.platforms,
      fs: {},
      history: [],
    };
  }
  return undefined;
}

/** Dépôts privés : visibles seulement par leur propriétaire ou les membres de l'organisation. */
export function canPull(state: SimState, repo: string): boolean {
  const entry = state.hub[repo];
  if (!entry?.private) return true;
  const namespace = repo.split("/")[0];
  return state.auth !== null && (state.auth === namespace || state.orgs.includes(namespace));
}

/** Enregistre une image sur le Hub simulé (docker push, buildx --push). */
export function publish(state: SimState, repo: string, tag: string, image: Image) {
  const snapshot: Partial<Image> = structuredClone(image);
  delete snapshot.id;
  delete snapshot.tags;
  state.hub[repo] ??= { private: false, tags: {} };
  state.hub[repo].tags[tag] = {
    platforms: image.platforms ?? ["linux/amd64"],
    pushedAt: Date.now(),
    image: snapshot as Omit<Image, "id" | "tags">,
  };
}

export function canPush(state: SimState, repo: string): boolean {
  const namespace = repo.split("/")[0];
  return state.auth !== null && repo.includes("/") && (state.auth === namespace || state.orgs.includes(namespace));
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

export function resolvePath(cwd: string, path: string, home = HOME): string {
  const absolute = path.startsWith("/") ? path : path === "~" || path.startsWith("~/") ? home + path.slice(1) : `${cwd}/${path}`;
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

export function displayPath(path: string, home = HOME): string {
  return path === home ? "~" : path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

// ─── Configuration initiale d'un exercice ──────────────────────────────────

export type ContainerSetup = {
  name: string;
  image: string;
  status?: "running" | "exited";
  ports?: string[];
  env?: string[];
  networks?: string[];
  /** Volumes montés, syntaxe -v (ex: "pgdata:/var/lib/postgresql/data"). */
  volumes?: string[];
  restart?: string;
  /** Fichiers supplémentaires présents dans le conteneur. */
  fs?: FileSystem;
};

export type CustomImageSetup = {
  ref: string;
  user?: string;
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
  /** Contexte Docker actif (desktop-linux par défaut). */
  context?: string;
  /** Organisations Docker Hub de l'utilisateur. */
  orgs?: string[];
  /** Dépôts déjà présents sur Docker Hub. */
  hub?: Record<string, { private?: boolean; tags: string[] }>;
  app?: Partial<AppBehavior>;
  /** Commandes exécutées pour préparer l'environnement (ex: "docker compose up -d"). */
  commands?: string[];
  /** Le poste possède déjà une paire de clés ssh. */
  sshKey?: boolean;
  /** Serveurs distants, par nom de machine. */
  machines?: Record<string, MachineSetup>;
};

/** Serveur distant (VPS) joignable en ssh depuis le poste. */
export type MachineSetup = Pick<SimulatorSetup, "images" | "customImages" | "containers" | "volumes" | "networks" | "dirs" | "auth"> & {
  ip: string;
  names?: string[];
  user: string;
  password?: string;
  passwordAuth?: boolean;
  dockerInstalled?: boolean;
  /** L'utilisateur est déjà dans le groupe docker. */
  dockerGroup?: boolean;
  /** La clé ssh du poste est déjà autorisée sur le serveur. */
  authorizeLocalKey?: boolean;
  /** Le serveur est déjà dans le known_hosts du poste. */
  knownByLocal?: boolean;
  /** Fichiers, relatifs au dossier personnel de l'utilisateur. */
  files?: FileSystem;
  /** Commandes de préparation, exécutées sur le serveur. */
  commands?: string[];
};

const LOCAL_KEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK8yq0dVn3mZb5lE2pXw7rT4uJ9sC1hF6gQ2aR8eL0oN alex@pc";

export const DEFAULT_CONTEXTS = {
  default: { description: "Current DOCKER_HOST based configuration", endpoint: "unix:///var/run/docker.sock" },
  "desktop-linux": { description: "Docker Desktop", endpoint: "unix:///home/alex/.docker/desktop/docker.sock" },
};

export const DEFAULT_APP: AppBehavior = { port: 3000, response: "Hello from Docker!", requiredEnv: [], urlEnv: [] };

const BUILTIN_NETWORKS: Network[] = [
  { id: randomHex(64), name: "bridge", driver: "bridge", createdAt: Date.now() - 30 * DAY, builtin: true },
  { id: randomHex(64), name: "host", driver: "host", createdAt: Date.now() - 30 * DAY, builtin: true },
  { id: randomHex(64), name: "none", driver: "null", createdAt: Date.now() - 30 * DAY, builtin: true },
];

type Identity = { user: string; hostname: string; home: string; workdir: string };

const LOCAL_IDENTITY: Identity = { user: "alex", hostname: "pc", home: HOME, workdir: PROJECT_DIR };

export function createState(setup: SimulatorSetup = {}, identity: Identity = LOCAL_IDENTITY): SimState {
  const base = identity.workdir;
  const state: SimState = {
    user: identity.user,
    hostname: identity.hostname,
    cwd: base,
    files: {},
    dirs: [...new Set([identity.home, base, ...(setup.dirs ?? []).map((dir) => resolvePath(base, dir, identity.home))])],
    machine: "local",
    machines: {},
    sshStack: [],
    layerCache: [],
    contexts: structuredClone(DEFAULT_CONTEXTS),
    images: [],
    containers: [],
    volumes: [],
    networks: structuredClone(BUILTIN_NETWORKS),
    shell: null,
    auth: setup.auth ?? null,
    orgs: setup.orgs ?? [],
    context: setup.context ?? "desktop-linux",
    buildCache: setup.buildCache ?? 0,
    hub: Object.fromEntries(
      Object.entries(setup.hub ?? {}).map(([repo, entry]) => [
        repo,
        {
          private: entry.private ?? false,
          tags: Object.fromEntries(entry.tags.map((tag) => [tag, { platforms: ["linux/amd64"], pushedAt: Date.now() - 7 * DAY }])),
        },
      ]),
    ),
    app: { ...DEFAULT_APP, ...setup.app },
  };

  for (const [path, content] of Object.entries(setup.files ?? {})) state.files[resolvePath(base, path, identity.home)] = content;

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
      slim: base?.slim,
      base: base ? parseImageRef(custom.base!).full : "node:22-alpine",
      user: custom.user,
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
    const container = buildContainer(
      {
        name: spec.name,
        imageInput: spec.image,
        image,
        env: spec.env,
        restart: spec.restart,
        ports: (spec.ports ?? []).map((port) => {
          const [host, target] = port.split(":");
          return { host, container: target };
        }),
        networks: spec.networks,
        mounts: (spec.volumes ?? []).map((volume) => {
          const [source, target] = volume.split(":");
          const bind = /^[./~]/.test(source);
          return {
            type: bind ? "bind" : "volume",
            source: bind ? resolvePath(base, source, identity.home) : source,
            target,
            readOnly: false,
          };
        }),
      },
      Date.now() - 2 * HOUR,
    );
    container.status = spec.status ?? "running";
    if (container.status === "exited") container.changedAt += 1000;
    container.fs = { ...container.fs, ...spec.fs };
    state.containers.push(container);
  }
  if (identity !== LOCAL_IDENTITY) return state;

  // Poste local : Docker Desktop installé, utilisateur dans le groupe docker.
  if (setup.sshKey) {
    state.files[`${HOME}/.ssh/id_ed25519`] =
      "-----BEGIN OPENSSH PRIVATE KEY-----\n(clé privée simulée)\n-----END OPENSSH PRIVATE KEY-----\n";
    state.files[`${HOME}/.ssh/id_ed25519.pub`] = `${LOCAL_KEY}\n`;
  }
  state.machines.local = {
    ip: "192.168.1.20",
    names: ["pc", "localhost"],
    os: "Ubuntu 24.04.1 LTS (WSL)",
    dockerInstalled: true,
    dockerGroup: [identity.user],
    pendingGroup: [],
    password: "alex",
    passwordAuth: true,
    authorizedKeys: [],
    data: snapshotOf(state),
  };
  for (const [id, machine] of Object.entries(setup.machines ?? {})) {
    const home = machine.user === "root" ? "/root" : `/home/${machine.user}`;
    const remote = createState(
      { ...machine, files: machine.files, context: "default" },
      { user: machine.user, hostname: id, home, workdir: home },
    );
    remote.contexts = { default: DEFAULT_CONTEXTS.default };
    state.machines[id] = {
      ip: machine.ip,
      names: machine.names ?? [],
      os: "Ubuntu 24.04.1 LTS",
      dockerInstalled: machine.dockerInstalled ?? false,
      dockerGroup: machine.dockerGroup ? [machine.user] : [],
      pendingGroup: [],
      password: machine.password ?? "changeme",
      passwordAuth: machine.passwordAuth ?? true,
      authorizedKeys: machine.authorizeLocalKey ? [LOCAL_KEY] : [],
      data: snapshotOf(remote),
    };
    if (machine.knownByLocal) {
      const knownHosts = [machine.ip, ...(machine.names ?? [])].map(
        (host) => `${host} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHb3rP0Fq2sXvKZ1pYy8eW4Lm6Tn0Qd5Rj7Uk9Sa2Vc`,
      );
      state.files[`${HOME}/.ssh/known_hosts`] = `${state.files[`${HOME}/.ssh/known_hosts`] ?? ""}${knownHosts.join("\n")}\n`;
    }
  }
  if (Object.keys(state.files).some((path) => path.startsWith(`${HOME}/.ssh/`))) state.dirs.push(`${HOME}/.ssh`);
  return state;
}

function snapshotOf(state: SimState): MachineData {
  const { user, hostname, cwd, files, dirs, images, containers, volumes, networks, buildCache, layerCache, auth, context, contexts } =
    state;
  return structuredClone({
    user,
    hostname,
    cwd,
    files,
    dirs,
    images,
    containers,
    volumes,
    networks,
    buildCache,
    layerCache,
    auth,
    context,
    contexts,
  });
}

export function cloneState(state: SimState): SimState {
  return structuredClone(state);
}

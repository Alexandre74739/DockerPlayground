import { randomHex } from "./format";
import type { Container, Image, Mount, PortBinding } from "./types";

export type ContainerOptions = {
  name: string;
  imageInput: string;
  image: Image;
  command?: string[];
  ports?: PortBinding[];
  env?: string[];
  mounts?: Mount[];
  networks?: string[];
  aliases?: string[];
  autoRemove?: boolean;
  restart?: string;
  healthcheck?: boolean;
  user?: string;
  limits?: Container["limits"];
  readOnly?: boolean;
  compose?: Container["compose"];
};

/** Construit un conteneur (état « created ») à partir d'une image. */
export function buildContainer(options: ContainerOptions, createdAt = Date.now()): Container {
  return {
    id: randomHex(64),
    name: options.name,
    image: options.imageInput,
    imageId: options.image.id,
    command: options.command?.length ? options.command : options.image.cmd,
    status: "created",
    exitCode: 0,
    createdAt,
    changedAt: createdAt,
    ports: options.ports ?? [],
    env: mergeEnv(options.image.env, options.env ?? []),
    mounts: options.mounts ?? [],
    networks: options.networks ?? ["bridge"],
    aliases: options.aliases ?? [],
    autoRemove: options.autoRemove ?? false,
    restart: options.restart ?? "no",
    healthcheck: options.healthcheck ?? Boolean(options.image.healthcheck),
    user: options.user ?? options.image.user,
    limits: options.limits ?? {},
    readOnly: options.readOnly ?? false,
    fs: { ...options.image.fs },
    kind: options.image.kind,
    alpine: options.image.alpine,
    compose: options.compose,
  };
}

/** Fusionne des variables KEY=valeur : les dernières l'emportent. */
export function mergeEnv(...lists: string[][]): string[] {
  const map = new Map<string, string>();
  for (const entry of lists.flat()) {
    const index = entry.indexOf("=");
    map.set(index === -1 ? entry : entry.slice(0, index), entry);
  }
  return [...map.values()];
}

export function envValue(env: string[], name: string): string | undefined {
  const entry = env.find((candidate) => candidate.startsWith(`${name}=`));
  return entry?.slice(name.length + 1);
}

import { parseDocument, stringify } from "yaml";
import { resolvePath } from "./state";
import type { SimState } from "./types";

/**
 * Lecture des fichiers Compose : interpolation des variables (.env),
 * fusion de plusieurs fichiers (-f), profils et validation.
 */

export type DependsOn = { service: string; condition: "service_started" | "service_healthy" | "service_completed_successfully" };

export type ComposeService = {
  name: string;
  image?: string;
  build?: { context: string; dockerfile: string };
  ports: string[];
  env: string[];
  volumes: string[];
  dependsOn: DependsOn[];
  healthcheck: boolean;
  restart?: string;
  command?: string[];
  user?: string;
};

export type ComposeProject = {
  name: string;
  dir: string;
  files: string[];
  services: ComposeService[];
  /** Services ignorés car leur profil n'est pas activé. */
  inactive: string[];
  volumes: string[];
  warnings: string[];
  /** Configuration normalisée, pour docker compose config. */
  config: Record<string, unknown>;
};

export type ComposeOptions = { files: string[]; projectName?: string; profiles: string[] };

const DEFAULT_FILES = ["compose.yaml", "compose.yml", "docker-compose.yaml", "docker-compose.yml"];
const OVERRIDE_FILES = ["compose.override.yaml", "compose.override.yml", "docker-compose.override.yaml", "docker-compose.override.yml"];

type Raw = Record<string, unknown>;
const isObject = (value: unknown): value is Raw => typeof value === "object" && value !== null && !Array.isArray(value);

/** Lit un fichier KEY=valeur (.env, env_file). */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    result[
      trimmed
        .slice(0, index)
        .replace(/^export\s+/, "")
        .trim()
    ] = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2");
  }
  return result;
}

function interpolate(text: string, variables: Record<string, string>, missing: Set<string>): string {
  return text.replace(/\$\$|\$\{(\w+)(?:(:?)([-?])([^}]*))?\}|\$(\w+)/g, (match, braced, colon, operator, operand, bare) => {
    if (match === "$$") return "$";
    const name: string = braced ?? bare;
    const current = variables[name];
    const empty = current === undefined || (colon === ":" && current === "");
    if (operator === "-" && empty) return operand;
    if (current === undefined) {
      missing.add(name);
      return "";
    }
    return current;
  });
}

/** Fusion façon Compose : les objets sont fusionnés, les listes concaténées, le reste remplacé. */
function merge(base: unknown, override: unknown): unknown {
  if (isObject(base) && isObject(override)) {
    const result: Raw = { ...base };
    for (const [key, value] of Object.entries(override)) result[key] = key in result ? merge(result[key], value) : value;
    return result;
  }
  if (Array.isArray(base) && Array.isArray(override))
    return [...new Set([...base, ...override].map((item) => JSON.stringify(item)))].map((item) => JSON.parse(item));
  return override;
}

const toList = (value: unknown): string[] =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value.map(String) : [String(value)];

function toEnv(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (isObject(value)) return Object.entries(value).map(([key, entry]) => `${key}=${entry ?? ""}`);
  return [];
}

function toCommand(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/\s+/);
  return undefined;
}

export function loadCompose(state: SimState, options: ComposeOptions): ComposeProject | { error: string } {
  const dir = state.cwd;
  const explicit = options.files.length > 0;
  const files = explicit
    ? options.files.map((file) => resolvePath(dir, file))
    : [DEFAULT_FILES, OVERRIDE_FILES]
        .map((names) => names.map((name) => `${dir}/${name}`).find((path) => state.files[path] !== undefined))
        .filter((path): path is string => Boolean(path));
  if (files.length === 0 || (!explicit && !DEFAULT_FILES.some((name) => state.files[`${dir}/${name}`] !== undefined))) {
    return { error: "no configuration file provided: not found" };
  }
  const missingFile = files.find((path) => state.files[path] === undefined);
  if (missingFile) return { error: `open ${missingFile}: no such file or directory` };

  const variables = { ...parseEnvFile(state.files[`${dir}/.env`] ?? "") };
  const missing = new Set<string>();
  const warnings: string[] = [];
  let merged: unknown = {};
  for (const path of files) {
    const document = parseDocument(interpolate(state.files[path], variables, missing));
    if (document.errors.length > 0) {
      const error = document.errors[0];
      const line = error.linePos?.[0].line ?? 1;
      return {
        error: `yaml: line ${line}: ${error.message
          .split("\n")[0]
          .replace(/ at line \d+, column \d+:?$/, "")
          .toLowerCase()}`,
      };
    }
    const content = document.toJS();
    if (!isObject(content)) return { error: `${path}: Top-level object must be a mapping` };
    if ("version" in content) {
      warnings.push(
        `WARN[0000] ${path}: the attribute \`version\` is obsolete, it will be ignored, please remove it to avoid potential confusion`,
      );
    }
    merged = merge(merged, content);
  }
  for (const name of missing) warnings.unshift(`WARN[0000] The "${name}" variable is not set. Defaulting to a blank string.`);

  const root = merged as Raw;
  const name = (options.projectName ?? (typeof root.name === "string" ? root.name : dir.split("/").pop()!)).toLowerCase();
  if (!isObject(root.services)) return { error: `${files[0]}: services must be a mapping` };
  const declaredVolumes = isObject(root.volumes) ? Object.keys(root.volumes) : [];

  const services: ComposeService[] = [];
  const inactive: string[] = [];
  for (const [serviceName, rawService] of Object.entries(root.services)) {
    if (!isObject(rawService)) return { error: `services.${serviceName} must be a mapping` };
    const profiles = toList(rawService.profiles);
    if (profiles.length > 0 && !profiles.some((profile) => options.profiles.includes(profile))) {
      inactive.push(serviceName);
      continue;
    }
    const build = rawService.build;
    if (!rawService.image && !build) {
      return { error: `service "${serviceName}" has neither an image nor a build context specified: invalid compose project` };
    }
    const envFiles = toList(rawService.env_file);
    const fileEnv: string[] = [];
    for (const file of envFiles) {
      const path = resolvePath(dir, file);
      if (state.files[path] === undefined) return { error: `env file ${path} not found: stat ${path}: no such file or directory` };
      fileEnv.push(...Object.entries(parseEnvFile(state.files[path])).map(([key, entry]) => `${key}=${entry}`));
    }
    const volumes = toList(rawService.volumes);
    for (const volume of volumes) {
      const source = volume.split(":")[0];
      if (volume.includes(":") && !/^[./~]/.test(source) && !declaredVolumes.includes(source)) {
        return { error: `service "${serviceName}" refers to undefined volume ${source}: invalid compose project` };
      }
    }
    const rawDepends = rawService.depends_on;
    const dependsOn: DependsOn[] = Array.isArray(rawDepends)
      ? rawDepends.map((service) => ({ service: String(service), condition: "service_started" }))
      : isObject(rawDepends)
        ? Object.entries(rawDepends).map(([service, config]) => ({
            service,
            condition: (isObject(config) && typeof config.condition === "string"
              ? config.condition
              : "service_started") as DependsOn["condition"],
          }))
        : [];
    services.push({
      name: serviceName,
      image: rawService.image ? String(rawService.image) : undefined,
      build: build
        ? {
            context: resolvePath(dir, isObject(build) ? String(build.context ?? ".") : String(build)),
            dockerfile: isObject(build) && build.dockerfile ? String(build.dockerfile) : "Dockerfile",
          }
        : undefined,
      ports: toList(rawService.ports),
      env: [...fileEnv, ...toEnv(rawService.environment)],
      volumes,
      dependsOn,
      healthcheck: isObject(rawService.healthcheck) && Boolean(rawService.healthcheck.test) && rawService.healthcheck.disable !== true,
      restart: rawService.restart ? String(rawService.restart) : undefined,
      command: toCommand(rawService.command),
      user: rawService.user ? String(rawService.user) : undefined,
    });
  }

  const known = new Set([...services.map((service) => service.name), ...inactive]);
  for (const service of services) {
    const unknown = service.dependsOn.find((dependency) => !known.has(dependency.service));
    if (unknown) return { error: `service "${service.name}" depends on undefined service "${unknown.service}": invalid compose project` };
    const disabled = service.dependsOn.find((dependency) => inactive.includes(dependency.service));
    if (disabled) return { error: `service "${service.name}" depends on undefined service "${disabled.service}": invalid compose project` };
  }

  return { name, dir, files, services, inactive, volumes: declaredVolumes, warnings, config: { name, ...root } };
}

/** Sortie de docker compose config. */
export function renderConfig(project: ComposeProject): string {
  return stringify(project.config, { indent: 2 }).trimEnd();
}

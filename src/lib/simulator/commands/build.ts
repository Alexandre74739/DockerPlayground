import { has, value, values } from "../args";
import { type CommandDef, fail, ok } from "../command";
import { MB } from "../format";
import { addImage, canPush, isDirectory, isValidReference, parseImageRef, publish, remoteImage, resolvePath } from "../state";
import type { FileSystem, Image, SimState } from "../types";

/** Simulation de `docker build` (BuildKit) à partir du Dockerfile du dossier. */

type Instruction = { line: number; keyword: string; args: string; raw: string };

const KNOWN = [
  "FROM",
  "RUN",
  "CMD",
  "LABEL",
  "EXPOSE",
  "ENV",
  "ADD",
  "COPY",
  "ENTRYPOINT",
  "VOLUME",
  "USER",
  "WORKDIR",
  "ARG",
  "ONBUILD",
  "STOPSIGNAL",
  "HEALTHCHECK",
  "SHELL",
];

export function parseDockerfile(content: string): Instruction[] | { error: string } {
  const instructions: Instruction[] = [];
  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const start = index;
    let text = lines[index].trim();
    while (text.endsWith("\\") && index + 1 < lines.length) text = `${text.slice(0, -1).trim()} ${lines[++index].trim()}`;
    if (!text || text.startsWith("#")) continue;
    const [keyword, ...rest] = text.split(/\s+/);
    const upper = keyword.toUpperCase();
    if (!KNOWN.includes(upper)) return { error: `dockerfile parse error on line ${start + 1}: unknown instruction: ${keyword}` };
    const args = rest.join(" ");
    if (!args) return { error: `dockerfile parse error on line ${start + 1}: ${upper} requires at least one argument` };
    instructions.push({ line: start + 1, keyword: upper, args, raw: `${upper} ${args}` });
  }
  return instructions;
}

function parseCommand(args: string): string[] {
  if (args.startsWith("[")) {
    try {
      const parsed = JSON.parse(args);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Forme shell si le JSON est invalide, comme Docker.
    }
  }
  return ["/bin/sh", "-c", args];
}

/** ENV CLE=valeur [CLE2=valeur2] ou forme historique ENV CLE valeur. */
function parseEnv(args: string): string[] {
  if (!args.includes("=") || /^\S+\s+[^=]*$/.test(args)) {
    const [name, ...rest] = args.split(/\s+/);
    return [`${name}=${rest.join(" ")}`];
  }
  return (args.match(/\S+=("[^"]*"|\S*)/g) ?? []).map((pair) => pair.replace(/="(.*)"$/, "=$1"));
}

function substitute(text: string, args: Record<string, string>): string {
  return text.replace(/\$\{(\w+)(?::?-([^}]*))?\}|\$(\w+)/g, (match, braced: string, fallback: string | undefined, bare: string) => {
    const name = braced ?? bare;
    return args[name] ?? fallback ?? (name in args ? "" : match);
  });
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/^\.\//, "")
    .replace(/\/$/, "")
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\?/g, "[^/]")
    .replace(/^\*\*\//, "§§")
    .replace(/\*\*/g, "§")
    .replace(/\*/g, "[^/]*")
    .replace(/§§/, "(?:.*/)?")
    .replace(/§/g, ".*");
  return new RegExp(`^${escaped}(/.*)?$`);
}

/** Règles du .dockerignore : la dernière règle qui correspond l'emporte (les « ! » ré-incluent). */
export function dockerignoreRules(content: string): { regex: RegExp; include: boolean }[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const include = line.startsWith("!");
      return { regex: globToRegex(line.replace(/^!/, "").replace(/^\//, "")), include };
    });
}

export function isIgnored(rules: { regex: RegExp; include: boolean }[], path: string): boolean {
  let ignored = false;
  for (const rule of rules) if (rule.regex.test(path)) ignored = !rule.include;
  return ignored;
}

/** Fichiers du contexte de build après application du .dockerignore. */
function contextFiles(state: SimState, contextDir: string): FileSystem {
  const rules = dockerignoreRules(state.files[`${contextDir}/.dockerignore`] ?? "");
  const files: FileSystem = {};
  for (const [path, content] of Object.entries(state.files)) {
    if (!path.startsWith(`${contextDir}/`)) continue;
    const relative = path.slice(contextDir.length + 1);
    if (!isIgnored(rules, relative)) files[relative] = content;
  }
  return files;
}

function hash(text: string): string {
  let value = 5381;
  for (const char of text) value = ((value * 33) ^ char.charCodeAt(0)) >>> 0;
  return value.toString(16);
}

type Stage = { name: string; base: Omit<Image, "id">; baseRef: string; steps: Instruction[]; index: number };

const DURATIONS: Record<string, number> = { FROM: 1.8, RUN: 4.6, COPY: 0.1, ADD: 0.2, WORKDIR: 0.1 };

export type BuildRequest = {
  contextDir: string;
  dockerfilePath: string;
  /** Nom du Dockerfile tel qu'affiché (ex: "Dockerfile.prod"). */
  dockerfileName: string;
  tags: string[];
  noCache?: boolean;
  target?: string;
  buildArgs?: Record<string, string>;
  platforms?: string[];
  /** Préfixe des lignes de progression (nom du service Compose). */
  label?: string;
};

export type BuildResult = { ok: true; output: string; image: Image } | { ok: false; output: string };

/** Construit une image depuis un Dockerfile du système de fichiers simulé. */
export function buildImage(state: SimState, request: BuildRequest): BuildResult {
  const failed = (output: string): BuildResult => ({ ok: false, output });
  const content = state.files[request.dockerfilePath];
  if (content === undefined) {
    return failed(
      `[+] Building 0.0s (1/1) FINISHED\n => [internal] load build definition from ${request.dockerfileName}\nERROR: failed to solve: failed to read dockerfile: open ${request.dockerfileName}: no such file or directory`,
    );
  }
  const parsedFile = parseDockerfile(content);
  if ("error" in parsedFile) return failed(`ERROR: failed to solve: ${parsedFile.error}`);

  // ARG déclarés avant le premier FROM : utilisables dans les FROM.
  const args: Record<string, string> = {};
  const setArg = (definition: string) => {
    const [name, defaultValue] = definition.split("=");
    args[name] = request.buildArgs?.[name] ?? defaultValue ?? "";
  };
  let index = 0;
  while (parsedFile[index]?.keyword === "ARG") setArg(parsedFile[index++].args);
  const instructions = parsedFile.slice(index);
  if (instructions[0]?.keyword !== "FROM") return failed("ERROR: failed to solve: no build stage in current context");

  // Découpage en étapes (multi-stage).
  const stages: Stage[] = [];
  for (const raw of instructions) {
    if (raw.keyword === "ARG") setArg(raw.args);
    const instruction = { ...raw, args: substitute(raw.args, args), raw: `${raw.keyword} ${substitute(raw.args, args)}` };
    if (instruction.keyword === "FROM") {
      const parts = instruction.args.split(/\s+/).filter((part) => !part.startsWith("--platform"));
      const [ref, as, name] = parts;
      const named = as?.toUpperCase() === "AS" ? name : undefined;
      const previous = stages.find((stage) => stage.name === ref);
      const base = previous ? previous.base : remoteImage(state, ref);
      if (!base) {
        const { repo, tag } = parseImageRef(ref);
        return failed(
          `ERROR: failed to solve: ${ref}: failed to resolve source metadata for docker.io/${repo.includes("/") ? repo : `library/${repo}`}:${tag}: pull access denied, repository does not exist or may require authorization: server message: insufficient_scope: authorization failed`,
        );
      }
      stages.push({
        name: named ?? `stage-${stages.length}`,
        base,
        baseRef: previous ? previous.baseRef : ref,
        steps: [instruction],
        index: stages.length,
      });
    } else stages.at(-1)!.steps.push(instruction);
  }

  const finalStage = request.target ? stages.find((stage) => stage.name === request.target) : stages.at(-1)!;
  if (!finalStage) return failed(`ERROR: failed to solve: target stage "${request.target}" could not be found`);

  const files = contextFiles(state, request.contextDir);
  const platforms = request.platforms?.length ? request.platforms : ["linux/amd64"];
  // Cache par couche : la clé de chaque instruction dépend de la précédente (et des fichiers copiés).
  const stageKeys: Record<string, string> = {};
  const newLayers: string[] = [];
  let missed = 0;

  const image: Omit<Image, "id"> = {
    ...finalStage.base,
    tags: [],
    fs: { ...finalStage.base.fs },
    history: [...finalStage.base.history],
    base: parseImageRef(finalStage.baseRef).full,
    platforms,
    createdAt: Date.now(),
  };
  let size = image.size;
  const lines: string[] = [];
  let elapsed = 0;
  const multi = stages.length > 1;
  const relevant = stages.filter((stage) => stage.index <= finalStage.index);
  const total = relevant.reduce((sum, stage) => sum + stage.steps.filter((step) => DURATIONS[step.keyword] !== undefined).length, 0) + 4;
  const prefix = request.label ? `${request.label} ` : "";
  const pad = (text: string, seconds: number) => `${text.padEnd(68)} ${seconds.toFixed(1)}s`;
  const failure = (...errorLines: string[]) =>
    failed(
      `[+] Building ${elapsed.toFixed(1)}s (${lines.length}/${total}) FINISHED${" ".repeat(30)}docker:${state.context}\n${[...lines, ...errorLines].join("\n")}`,
    );

  lines.push(
    pad(` => [${prefix}internal] load build definition from ${request.dockerfileName}`, 0),
    pad(` => => transferring dockerfile: ${content.length}B`, 0),
  );
  for (const stage of relevant) {
    if (!stages.some((other) => other.name === stage.steps[0].args.split(/\s+/).find((part) => !part.startsWith("--")))) {
      const { repo, tag } = parseImageRef(stage.baseRef);
      for (const platform of platforms.length > 1 ? platforms : [""]) {
        lines.push(
          pad(
            ` => [${prefix}${platform ? `${platform} ` : ""}internal] load metadata for docker.io/${repo.includes("/") ? repo : `library/${repo}`}:${tag}`,
            1.2,
          ),
        );
      }
    }
  }
  lines.push(
    pad(` => [${prefix}internal] load .dockerignore`, 0),
    pad(` => => transferring context: ${state.files[`${request.contextDir}/.dockerignore`]?.length ?? 2}B`, 0),
  );

  for (const stage of relevant) {
    const counted = stage.steps.filter((step) => DURATIONS[step.keyword] !== undefined);
    const isFinal = stage === finalStage;
    let workdir = stage.base.workdir ?? "/";
    let key = hash(`${stage.baseRef}|${platforms.join(",")}`);
    let position = 0;
    for (const step of stage.steps) {
      if (DURATIONS[step.keyword] === undefined) {
        key = hash(`${key}|${step.raw}`);
        continue;
      }
      const label = `${prefix}${multi ? `${stage.name} ` : ""}${++position}/${counted.length}`;
      let inputs = "";
      if (step.keyword === "WORKDIR") workdir = step.args.startsWith("/") ? step.args : `${workdir.replace(/\/$/, "")}/${step.args}`;
      if (step.keyword === "COPY" || step.keyword === "ADD") {
        const parts = step.args.split(/\s+/);
        const fromStage = parts.find((part) => part.startsWith("--from="))?.slice(7);
        const operands = parts.filter((part) => !part.startsWith("--"));
        const destination = operands.pop()!;
        if (fromStage && !stages.some((other) => other.name === fromStage)) {
          return failure(`ERROR: failed to solve: failed to parse stage name "${fromStage}": invalid reference format`);
        }
        if (fromStage) inputs = stageKeys[fromStage] ?? "";
        for (const source of operands) {
          if (fromStage) continue;
          const regex = globToRegex(source);
          const matches = Object.keys(files).filter((file) => source === "." || regex.test(file));
          if (matches.length === 0) {
            return failure(
              ` => ERROR [${label}] ${step.raw}`,
              `ERROR: failed to solve: failed to compute cache key: failed to calculate checksum of ref ${hash(source)}::${hash(step.raw)}: "/${source.replace(/^\.\//, "")}": not found`,
            );
          }
          inputs += matches
            .sort()
            .map((file) => `${file}:${hash(files[file])}`)
            .join(",");
          if (isFinal) {
            const targetDir = destination.startsWith("/")
              ? destination
              : `${workdir.replace(/\/$/, "")}/${destination.replace(/^\.\/?/, "")}`;
            for (const file of matches) {
              image.fs[`${targetDir.replace(/\/$/, "")}/${source === "." ? file : file.split("/").pop()}`] = files[file];
            }
          }
        }
        if (fromStage && isFinal) {
          image.fs[`${destination.replace(/\/$/, "")}/index.html`] = '<!doctype html><html><body><div id="root"></div></body></html>';
          size += 2.4 * MB;
        }
      }
      key = hash(`${key}|${step.raw}|${inputs}`);
      const cached = step.keyword !== "FROM" && !request.noCache && (state.layerCache.includes(key) || newLayers.includes(key));
      if (!cached && step.keyword !== "FROM") {
        missed++;
        newLayers.push(key);
        if (step.keyword === "RUN") state.buildCache += 45 * MB;
      }
      const seconds = cached ? 0 : DURATIONS[step.keyword];
      elapsed += seconds;
      if (step.keyword === "RUN" && isFinal) size += 38 * MB;
      const text =
        step.keyword === "FROM"
          ? `FROM docker.io/library/${parseImageRef(stage.baseRef).full}@sha256:${hash(stage.baseRef).padEnd(12, "0")}…`
          : step.raw;
      lines.push(pad(` => ${cached ? "CACHED " : ""}[${label}] ${text}`, seconds));
      if (step.keyword === "FROM" && !lines.some((line) => line.includes("load build context"))) {
        lines.push(
          pad(` => [${prefix}internal] load build context`, 0),
          pad(` => => transferring context: ${Object.values(files).join("").length}B`, 0),
        );
      }
    }
    stageKeys[stage.name] = key;
    if (isFinal) {
      image.workdir = workdir;
      image.buildKey = key;
    }
  }
  state.layerCache = [...new Set([...state.layerCache, ...newLayers])];

  // Métadonnées de l'image finale.
  for (const step of finalStage.steps) {
    if (step.keyword === "CMD") image.cmd = parseCommand(step.args);
    if (step.keyword === "EXPOSE") {
      image.exposed = [
        ...new Set([...image.exposed, ...step.args.split(/\s+/).map((port) => (port.includes("/") ? port : `${port}/tcp`))]),
      ];
    }
    if (step.keyword === "ENV") image.env = [...image.env, ...parseEnv(step.args)];
    if (step.keyword === "USER") image.user = step.args.split(":")[0];
    if (step.keyword === "HEALTHCHECK") image.healthcheck = !/^NONE$/i.test(step.args.trim());
  }
  const hasCmd = finalStage.steps.some((step) => step.keyword === "CMD");
  if (hasCmd && (image.kind === "node" || image.kind === "python")) image.kind = "app";
  image.size = size + Object.values(image.fs).join("").length;
  image.history = [
    ...finalStage.steps
      .slice(1)
      .reverse()
      .map((step) => ({ createdBy: step.raw, size: step.keyword === "RUN" ? 38 * MB : 0 })),
    ...image.history,
  ];
  image.tags = request.tags.map((tagName) => parseImageRef(tagName).full);
  // Build identique : Docker réutilise la même image et ajoute simplement les tags.
  const reused = missed === 0 ? state.images.find((candidate) => candidate.buildKey === image.buildKey) : undefined;
  if (reused) {
    for (const ref of image.tags) {
      for (const other of state.images) other.tags = other.tags.filter((existing) => existing !== ref);
      reused.tags.push(ref);
    }
  }
  const created = reused ?? addImage(state, image);
  lines.push(
    pad(` => ${request.label ? `[${request.label}] ` : ""}exporting to image`, 0.2),
    pad(" => => exporting layers", 0.1),
    pad(` => => writing image sha256:${created.id}`, 0),
    ...image.tags.map((ref) => pad(` => => naming to docker.io/${ref.includes("/") ? ref : `library/${ref}`}`, 0)),
  );
  const header = `[+] Building ${(elapsed + 0.4).toFixed(1)}s (${total}/${total}) FINISHED`;
  return { ok: true, output: `${header.padEnd(60)}docker:${state.context}\n${lines.join("\n")}`, image: created };
}

export const buildCommand: CommandDef = {
  path: "buildx build",
  aliases: ["build", "image build", "builder build"],
  spec: {
    usage: "docker buildx build [OPTIONS] PATH | URL | -",
    description: "Start a build",
    minArgs: 1,
    maxArgs: 1,
    options: [
      { names: ["--build-arg"], value: "stringArray", description: "Set build-time variables" },
      { names: ["-f", "--file"], value: "string", description: 'Name of the Dockerfile (default: "PATH/Dockerfile")' },
      { names: ["--no-cache"], description: "Do not use cache when building the image" },
      { names: ["--platform"], value: "stringArray", description: "Set target platform for build" },
      { names: ["--progress"], value: "string", description: 'Set type of progress output ("auto", "plain", "tty")' },
      { names: ["--push"], description: 'Shorthand for "--output=type=registry"' },
      { names: ["-q", "--quiet"], description: "Suppress the build output and print image ID on success" },
      { names: ["-t", "--tag"], value: "stringArray", description: 'Image identifier (format: "[registry/]repository[:tag]")' },
      { names: ["--target"], value: "string", description: "Set the target build stage to build" },
    ],
  },
  run: ({ state, parsed }) => {
    const contextArg = parsed.args[0];
    const contextDir = contextArg === "." ? state.cwd : resolvePath(state.cwd, contextArg);
    if (!isDirectory(state.files, state.dirs, contextDir)) return fail(`ERROR: unable to prepare context: path "${contextArg}" not found`);

    const tags = values(parsed, "--tag");
    const invalid = tags.find((tagName) => !isValidReference(tagName));
    if (invalid) return fail(`ERROR: invalid tag "${invalid}": invalid reference format`);

    const fileArg = value(parsed, "--file");
    const platforms = values(parsed, "--platform").flatMap((entry) => entry.split(","));
    const result = buildImage(state, {
      contextDir,
      dockerfilePath: fileArg ? resolvePath(state.cwd, fileArg) : `${contextDir}/Dockerfile`,
      dockerfileName: fileArg ?? "Dockerfile",
      tags,
      noCache: has(parsed, "--no-cache"),
      target: value(parsed, "--target"),
      buildArgs: Object.fromEntries(
        values(parsed, "--build-arg").map((entry) => [entry.split("=")[0], entry.split("=").slice(1).join("=")]),
      ),
      platforms,
    });
    if (!result.ok) return fail(result.output);
    if (has(parsed, "--quiet")) return ok(`sha256:${result.image.id}`);
    if (!has(parsed, "--push")) return ok(result.output);

    // --push : envoi direct sur le registre, sans passer par docker push.
    const lines = [result.output];
    for (const ref of result.image.tags) {
      const { repo, tag } = parseImageRef(ref);
      if (!canPush(state, repo)) {
        return fail(
          `${lines.join("\n")}\nERROR: failed to solve: failed to push docker.io/${repo}:${tag}: push access denied, repository does not exist or may require authorization: server message: insufficient_scope: authorization failed`,
        );
      }
      publish(state, repo, tag, result.image);
      lines.push(
        ` => => pushing layers${" ".repeat(48)} 2.1s`,
        ` => => pushing manifest for docker.io/${repo}:${tag}${" ".repeat(10)} 0.4s`,
      );
    }
    return ok(lines.join("\n"));
  },
};

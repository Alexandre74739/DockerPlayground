import { has, value, values } from "../args";
import { type CommandDef, fail, ok } from "../command";
import { MB } from "../format";
import { addImage, isDirectory, isValidReference, parseImageRef, remoteImage, resolvePath } from "../state";
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

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/^\.\//, "")
    .replace(/\/$/, "")
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "§")
    .replace(/\*/g, "[^/]*")
    .replace(/§/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}(/.*)?$`);
}

/** Fichiers du contexte de build après application du .dockerignore. */
function contextFiles(state: SimState, contextDir: string): FileSystem {
  const ignore = (state.files[`${contextDir}/.dockerignore`] ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((pattern) => globToRegex(pattern.replace(/^\//, "")));
  const files: FileSystem = {};
  for (const [path, content] of Object.entries(state.files)) {
    if (!path.startsWith(`${contextDir}/`)) continue;
    const relative = path.slice(contextDir.length + 1);
    if (!ignore.some((regex) => regex.test(relative))) files[relative] = content;
  }
  return files;
}

function hash(text: string): string {
  let value = 5381;
  for (const char of text) value = ((value * 33) ^ char.charCodeAt(0)) >>> 0;
  return value.toString(16);
}

type Stage = { name: string; base: Omit<Image, "id"> | null; baseRef: string; steps: Instruction[]; index: number };

const DURATIONS: Record<string, number> = { FROM: 1.8, RUN: 4.6, COPY: 0.1, ADD: 0.2, WORKDIR: 0.1 };

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
    const dockerfilePath = fileArg ? resolvePath(state.cwd, fileArg) : `${contextDir}/Dockerfile`;
    const dockerfileName = fileArg ?? "Dockerfile";
    const content = state.files[dockerfilePath];
    if (content === undefined) {
      return fail(
        `[+] Building 0.0s (1/1) FINISHED\n => [internal] load build definition from ${dockerfileName}\nERROR: failed to solve: failed to read dockerfile: open ${dockerfileName}: no such file or directory`,
      );
    }
    const parsedFile = parseDockerfile(content);
    if ("error" in parsedFile) return fail(`ERROR: failed to solve: ${parsedFile.error}`);
    const instructions = parsedFile.filter((instruction) => instruction.keyword !== "ARG" || parsedFile.indexOf(instruction) > 0);
    if (instructions[0]?.keyword !== "FROM") return fail("ERROR: failed to solve: no build stage in current context");

    // Découpage en étapes (multi-stage).
    const stages: Stage[] = [];
    for (const instruction of instructions) {
      if (instruction.keyword === "FROM") {
        const [ref, as, name] = instruction.args.split(/\s+/);
        const named = as?.toUpperCase() === "AS" ? name : undefined;
        const previous = stages.find((stage) => stage.name === ref);
        const base = previous ? previous.base : (remoteImage(state, ref) ?? null);
        if (!base) {
          const { repo, tag } = parseImageRef(ref);
          return fail(
            `ERROR: failed to solve: ${ref}: failed to resolve source metadata for docker.io/${repo.includes("/") ? repo : `library/${repo}`}:${tag}: pull access denied, repository does not exist or may require authorization: server message: insufficient_scope: authorization failed`,
          );
        }
        stages.push({ name: named ?? `stage-${stages.length}`, base, baseRef: ref, steps: [instruction], index: stages.length });
      } else stages.at(-1)!.steps.push(instruction);
    }

    const target = value(parsed, "--target");
    const finalStage = target ? stages.find((stage) => stage.name === target) : stages.at(-1)!;
    if (!finalStage) return fail(`ERROR: failed to solve: target stage "${target}" could not be found`);

    const files = contextFiles(state, contextDir);
    const buildKey = hash(content + JSON.stringify(files));
    const cached = !has(parsed, "--no-cache") && state.images.some((image) => image.buildKey === buildKey);

    // Vérifie les sources des COPY et construit le système de fichiers final.
    const image: Omit<Image, "id"> = {
      ...finalStage.base!,
      tags: [],
      fs: { ...finalStage.base!.fs },
      history: [...finalStage.base!.history],
      buildKey,
      createdAt: Date.now(),
    };
    let size = image.size;
    const lines: string[] = [];
    let elapsed = 0;
    const multi = stages.length > 1;
    const relevant = stages.filter((stage) => stage.index <= finalStage.index);
    const total = relevant.reduce((sum, stage) => sum + stage.steps.filter((step) => DURATIONS[step.keyword] !== undefined).length, 0) + 4;
    const pad = (text: string, seconds: number) => `${text.padEnd(68)} ${seconds.toFixed(1)}s`;
    const failure = (...errorLines: string[]) =>
      fail(
        `[+] Building ${elapsed.toFixed(1)}s (${lines.length}/${total}) FINISHED${" ".repeat(30)}docker:${state.context}\n${[...lines, ...errorLines].join("\n")}`,
      );

    lines.push(
      pad(` => [internal] load build definition from ${dockerfileName}`, 0),
      pad(` => => transferring dockerfile: ${content.length}B`, 0),
    );
    for (const stage of relevant) {
      if (!stages.some((other) => other.name === stage.baseRef)) {
        const { repo, tag } = parseImageRef(stage.baseRef);
        lines.push(pad(` => [internal] load metadata for docker.io/${repo.includes("/") ? repo : `library/${repo}`}:${tag}`, 1.2));
      }
    }
    lines.push(
      pad(" => [internal] load .dockerignore", 0),
      pad(` => => transferring context: ${state.files[`${contextDir}/.dockerignore`]?.length ?? 2}B`, 0),
    );

    for (const stage of relevant) {
      const counted = stage.steps.filter((step) => DURATIONS[step.keyword] !== undefined);
      let workdir = stage.base?.workdir ?? "/";
      for (const [stepIndex, step] of counted.entries()) {
        const label = `${multi ? `${stage.name} ` : ""}${stepIndex + 1}/${counted.length}`;
        const isFinal = stage === finalStage;
        if (step.keyword === "WORKDIR") workdir = step.args.startsWith("/") ? step.args : `${workdir.replace(/\/$/, "")}/${step.args}`;
        if (step.keyword === "COPY" || step.keyword === "ADD") {
          const parts = step.args.split(/\s+/);
          const fromStage = parts.find((part) => part.startsWith("--from="))?.slice(7);
          const operands = parts.filter((part) => !part.startsWith("--"));
          const destination = operands.pop()!;
          if (fromStage && !stages.some((other) => other.name === fromStage)) {
            return failure(`ERROR: failed to solve: failed to parse stage name "${fromStage}": invalid reference format`);
          }
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
            if (isFinal) {
              const targetDir = destination.startsWith("/")
                ? destination
                : `${workdir.replace(/\/$/, "")}/${destination.replace(/^\.\/?/, "")}`;
              for (const file of matches)
                image.fs[`${targetDir.replace(/\/$/, "")}/${source === "." ? file : file.split("/").pop()}`] = files[file];
            }
          }
          if (fromStage && isFinal)
            image.fs[`${destination.replace(/\/$/, "")}/index.html`] = '<!doctype html><html><body><div id="root"></div></body></html>';
        }
        const seconds = cached && step.keyword !== "FROM" ? 0 : DURATIONS[step.keyword];
        elapsed += seconds;
        if (step.keyword === "RUN" && !cached) size += 38 * MB;
        const text =
          step.keyword === "FROM"
            ? `FROM docker.io/library/${parseImageRef(stage.baseRef).full}@sha256:${hash(stage.baseRef).padEnd(12, "0")}…`
            : step.raw;
        lines.push(pad(` => ${cached && step.keyword !== "FROM" ? "CACHED " : ""}[${label}] ${text}`, seconds));
        if (step.keyword === "FROM" && !lines.some((line) => line.includes("load build context"))) {
          lines.push(
            pad(" => [internal] load build context", 0),
            pad(` => => transferring context: ${Object.values(files).join("").length}B`, 0),
          );
        }
      }
      if (stage === finalStage) image.workdir = workdir;
    }

    // Métadonnées de l'image finale.
    for (const step of finalStage.steps) {
      if (step.keyword === "CMD") image.cmd = parseCommand(step.args);
      if (step.keyword === "EXPOSE")
        image.exposed = [
          ...new Set([...image.exposed, ...step.args.split(/\s+/).map((port) => (port.includes("/") ? port : `${port}/tcp`))]),
        ];
      if (step.keyword === "ENV") image.env = [...image.env, step.args.includes("=") ? step.args : step.args.replace(/\s+/, "=")];
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
    image.tags = tags.map((tagName) => parseImageRef(tagName).full);
    if (!cached) state.buildCache += 45 * MB;

    // Build identique en cache : Docker réutilise la même image et ajoute simplement les tags.
    const reused = cached ? state.images.find((candidate) => candidate.buildKey === buildKey) : undefined;
    if (reused) {
      for (const ref of image.tags) {
        for (const other of state.images) other.tags = other.tags.filter((existing) => existing !== ref);
        reused.tags.push(ref);
      }
    }
    const created = reused ?? addImage(state, image);
    lines.push(
      pad(" => exporting to image", 0.2),
      pad(" => => exporting layers", 0.1),
      pad(` => => writing image sha256:${created.id}`, 0),
      ...image.tags.map((ref) => pad(` => => naming to docker.io/${ref.includes("/") ? ref : `library/${ref}`}`, 0)),
    );
    if (has(parsed, "--quiet")) return ok(`sha256:${created.id}`);
    const header = `[+] Building ${(elapsed + 0.4).toFixed(1)}s (${total}/${total}) FINISHED`;
    return ok(`${header.padEnd(60)}docker:${state.context}\n${lines.join("\n")}`);
  },
};

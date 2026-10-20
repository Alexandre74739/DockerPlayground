import { value } from "../args";
import { ask, type CommandDef, fail, join, ok, type Outcome } from "../command";
import { humanSize, table } from "../format";
import { addImage, findImage, parseImageRef, resolvePath } from "../state";
import type { Image, SimState } from "../types";

/** Outils complémentaires : save / load, docker scout, buildx imagetools, docker init. */

const ARCHIVE_MARKER = "#docker-playground-archive\n";

const save: CommandDef = {
  path: "image save",
  aliases: ["save"],
  spec: {
    usage: "docker save [OPTIONS] IMAGE [IMAGE...]",
    description: "Save one or more images to a tar archive (streamed to STDOUT by default)",
    minArgs: 1,
    options: [{ names: ["-o", "--output"], value: "string", description: "Write to a file, instead of STDOUT" }],
  },
  run: ({ state, parsed }) => {
    const output = value(parsed, "--output");
    if (!output) return fail("cowardly refusing to save to a terminal. Use the -o flag or redirect");
    const images: Image[] = [];
    for (const name of parsed.args) {
      const image = findImage(state, name);
      if (!image) return fail(`Error response from daemon: reference does not exist`);
      images.push({ ...image, tags: image.tags.filter((tag) => tag === parseImageRef(name).full || name.length >= 12) });
    }
    state.files[resolvePath(state.cwd, output)] = ARCHIVE_MARKER + JSON.stringify(images);
    return ok();
  },
};

const load: CommandDef = {
  path: "image load",
  aliases: ["load"],
  spec: {
    usage: "docker load [OPTIONS]",
    description: "Load an image from a tar archive or STDIN",
    maxArgs: 0,
    options: [{ names: ["-i", "--input"], value: "string", description: "Read from tar archive file, instead of STDIN" }],
  },
  run: ({ state, parsed }) => {
    const input = value(parsed, "--input");
    if (!input) return fail("requested load from stdin, but stdin is empty");
    const path = resolvePath(state.cwd, input);
    const content = state.files[path];
    if (content === undefined) return fail(`open ${path}: no such file or directory`);
    if (!content.startsWith(ARCHIVE_MARKER)) return fail("Error response from daemon: unexpected EOF");
    const images = JSON.parse(content.slice(ARCHIVE_MARKER.length)) as Image[];
    const lines: string[] = [];
    for (const image of images) {
      if (!state.images.some((existing) => existing.id === image.id)) addImage(state, image);
      else state.images.find((existing) => existing.id === image.id)!.tags.push(...image.tags);
      lines.push(...image.tags.map((tag) => `Loaded image: ${tag}`));
    }
    return ok(lines.join("\n"));
  },
};

// ─── docker scout ──────────────────────────────────────────────────────────

type Vulnerabilities = { critical: number; high: number; medium: number; low: number; packages: number };

/** Profil de vulnérabilités simulé, selon la famille de l'image de base. */
function vulnerabilities(image: Pick<Image, "kind" | "alpine" | "slim" | "base">): Vulnerabilities {
  const base = image.base ?? "";
  if (image.kind === "hello-world") return { critical: 0, high: 0, medium: 0, low: 0, packages: 1 };
  if (image.alpine || base.includes("alpine")) return { critical: 0, high: 0, medium: 1, low: 2, packages: 34 };
  if (image.slim || base.includes("slim")) return { critical: 0, high: 2, medium: 9, low: 24, packages: 112 };
  return { critical: 1, high: 14, medium: 38, low: 112, packages: 487 };
}

const summary = (v: Vulnerabilities) =>
  `${String(v.critical).padStart(3)}C ${String(v.high).padStart(5)}H ${String(v.medium).padStart(5)}M ${String(v.low).padStart(5)}L`;

function recommendedBase(image: Image): string | undefined {
  const { repo, tag } = parseImageRef(image.base ?? image.tags[0] ?? "");
  if (image.alpine || tag.includes("alpine")) return undefined;
  const version = tag.match(/^\d+/)?.[0];
  return `${repo}:${version ? `${version}-` : ""}alpine`;
}

function scoutTarget(state: SimState, name: string | undefined): Image | Outcome {
  if (!name) return fail("ERROR image reference is required");
  const image = findImage(state, name);
  if (!image) return fail(`ERROR failed to get image ${name}: No such image: ${parseImageRef(name).full}`);
  return image;
}

const scoutQuickview: CommandDef = {
  path: "scout quickview",
  aliases: ["scout qv"],
  spec: { usage: "docker scout quickview [IMAGE|DIRECTORY|ARCHIVE]", description: "Quick overview of an image", maxArgs: 1 },
  run: ({ state, parsed }) => {
    const target = scoutTarget(state, parsed.args[0]);
    if (!("id" in target)) return target;
    const current = vulnerabilities(target);
    const base = parseImageRef(target.base ?? target.tags[0]).full;
    const better = recommendedBase(target);
    const rows = [
      `  Target             │  ${target.tags[0] ?? target.id.slice(0, 12)}`.padEnd(48) + `│ ${summary(current)}`,
      `    digest           │  ${target.id.slice(0, 12)}`.padEnd(48) + "│",
      `  Base image         │  ${base}`.padEnd(48) + `│ ${summary(current)}`,
    ];
    if (better)
      rows.push(
        `  Updated base image │  ${better}`.padEnd(48) + `│ ${summary(vulnerabilities({ kind: target.kind, alpine: true, base: better }))}`,
      );
    return ok(
      join(
        `    ✓ SBOM of image already cached, ${current.packages} packages indexed`,
        "",
        `  i Base image was auto-detected. To get more accurate results, build images with max-mode provenance attestations.`,
        "",
        ...rows,
        "",
        "What's next:",
        `    View vulnerabilities → docker scout cves ${parsed.args[0]}`,
        `    View base image update recommendations → docker scout recommendations ${parsed.args[0]}`,
      ),
    );
  },
};

const scoutCves: CommandDef = {
  path: "scout cves",
  spec: {
    usage: "docker scout cves [OPTIONS] [IMAGE|DIRECTORY|ARCHIVE]",
    description: "Display CVEs identified in a software artifact",
    maxArgs: 1,
    options: [
      {
        names: ["--only-severity"],
        value: "severities",
        description: "Comma separated list of severities (critical, high, medium, low, unspecified)",
      },
    ],
  },
  run: ({ state, parsed }) => {
    const target = scoutTarget(state, parsed.args[0]);
    if (!("id" in target)) return target;
    const v = vulnerabilities(target);
    const total = v.critical + v.high + v.medium + v.low;
    const vulnerable = Math.max(0, Math.round(total / 6));
    return ok(
      join(
        `    ✓ SBOM of image already cached, ${v.packages} packages indexed`,
        `    ${total ? "✗" : "✓"} Detected ${vulnerable} vulnerable packages with a total of ${total} vulnerabilities`,
        "",
        "## Overview",
        "",
        `                    │       Analyzed Image`,
        `────────────────────┼──────────────────────────────`,
        `  Target            │  ${target.tags[0] ?? target.id.slice(0, 12)}`,
        `    platform        │ ${(target.platforms ?? ["linux/amd64"])[0]}`,
        `    vulnerabilities │ ${summary(v)}`,
        `    size            │ ${humanSize(target.size)}`,
        `    packages        │ ${v.packages}`,
        "",
        total
          ? "Run 'docker scout recommendations' to see base image alternatives with fewer vulnerabilities."
          : "No vulnerable packages detected.",
      ),
    );
  },
};

const scoutRecommendations: CommandDef = {
  path: "scout recommendations",
  spec: {
    usage: "docker scout recommendations [IMAGE|REPO]",
    description: "Display available base image updates and remediation recommendations",
    maxArgs: 1,
  },
  run: ({ state, parsed }) => {
    const target = scoutTarget(state, parsed.args[0]);
    if (!("id" in target)) return target;
    const better = recommendedBase(target);
    const current = vulnerabilities(target);
    if (!better)
      return ok(
        join("  Target   │  " + (target.tags[0] ?? ""), "", "  ✓ The base image is already up to date and minimal. No recommendation."),
      );
    const improved = vulnerabilities({ kind: target.kind, alpine: true, base: better });
    return ok(
      join(
        `  Target     │  ${target.tags[0] ?? target.id.slice(0, 12)}`,
        `  Base image │  ${parseImageRef(target.base ?? "").full}`,
        "",
        "## Recommended fixes",
        "",
        `  Change base image to ${better}`,
        "",
        table(
          ["", "Current", "Recommended"],
          [
            ["Vulnerabilities", summary(current).trim(), summary(improved).trim()],
            ["Packages", String(current.packages), String(improved.packages)],
          ],
        ),
      ),
    );
  },
};

const imagetools: CommandDef = {
  path: "buildx imagetools inspect",
  spec: {
    usage: "docker buildx imagetools inspect [OPTIONS] NAME",
    description: "Show details of an image in the registry",
    minArgs: 1,
    maxArgs: 1,
  },
  run: ({ state, parsed }) => {
    const { repo, tag, full } = parseImageRef(parsed.args[0]);
    const entry = state.hub[repo]?.tags[tag];
    if (!entry) return fail(`ERROR: docker.io/${full}: not found`);
    return ok(
      join(
        `Name:      docker.io/${full}`,
        "MediaType: application/vnd.oci.image.index.v1+json",
        "",
        "Manifests:",
        ...entry.platforms.map(
          (platform) =>
            `  Name:      docker.io/${full}\n  MediaType: application/vnd.oci.image.manifest.v1+json\n  Platform:  ${platform}\n`,
        ),
      ),
    );
  },
};

// ─── docker init ───────────────────────────────────────────────────────────

const TEMPLATES = {
  node: (version: string, command: string, port: string) => ({
    Dockerfile: `# syntax=docker/dockerfile:1

ARG NODE_VERSION=${version}

FROM node:\${NODE_VERSION}-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

# Exécute l'application avec un utilisateur non privilégié.
USER node

COPY . .

EXPOSE ${port}

CMD ${JSON.stringify(command.split(" "))}
`,
    compose: `services:
  server:
    build:
      context: .
    environment:
      NODE_ENV: production
    ports:
      - ${port}:${port}
`,
    ignore: "**/.git\n**/node_modules\n**/.env\n**/npm-debug.log\n**/Dockerfile*\n**/compose*\n**/README.md\n",
  }),
  python: (version: string, command: string, port: string) => ({
    Dockerfile: `# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=${version}
FROM python:\${PYTHON_VERSION}-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN python -m pip install -r requirements.txt

USER nobody

COPY . .

EXPOSE ${port}

CMD ${JSON.stringify(command.split(" "))}
`,
    compose: `services:
  server:
    build:
      context: .
    ports:
      - ${port}:${port}
`,
    ignore: "**/.git\n**/__pycache__\n**/.venv\n**/.env\n**/Dockerfile*\n**/compose*\n**/README.md\n",
  }),
};

const PLATFORMS = { node: "Node", python: "Python" } as const;

const init: CommandDef = {
  path: "init",
  spec: { usage: "docker init [OPTIONS]", description: "Creates Docker-related starter files for your project", maxArgs: 0 },
  run: ({ state }) => {
    const existing = ["Dockerfile", "compose.yaml", ".dockerignore"].filter((name) => state.files[`${state.cwd}/${name}`] !== undefined);
    const detected =
      state.files[`${state.cwd}/package.json`] !== undefined
        ? "node"
        : state.files[`${state.cwd}/requirements.txt`] !== undefined
          ? "python"
          : "node";
    const intro = join(
      "",
      "Welcome to the Docker Init CLI!",
      "",
      "This utility will walk you through creating the following files with sensible defaults for your project:",
      "  - .dockerignore",
      "  - Dockerfile",
      "  - compose.yaml",
      "  - README.Docker.md",
      "",
      "Let's get started!",
      existing.length
        ? `\nWARNING: The following Docker files already exist in this directory:\n${existing.map((name) => `  - ${name}`).join("\n")}\n`
        : undefined,
    );
    const finish =
      (platform: "node" | "python", version: string, command: string, port: string) =>
      (next: SimState): Outcome => {
        const files = TEMPLATES[platform](version, command, port);
        next.files[`${next.cwd}/Dockerfile`] = files.Dockerfile;
        next.files[`${next.cwd}/compose.yaml`] = files.compose;
        next.files[`${next.cwd}/.dockerignore`] = files.ignore;
        next.files[`${next.cwd}/README.Docker.md`] =
          `### Building and running your application\n\nWhen you're ready, start your application by running:\n\`docker compose up --build\`.\n\nYour application will be available at http://localhost:${port}.\n`;
        return ok(
          join(
            "",
            "✔ Created → .dockerignore",
            "✔ Created → Dockerfile",
            "✔ Created → compose.yaml",
            "✔ Created → README.Docker.md",
            "",
            "→ Your Docker files are ready!",
            "  Review your Docker files and tailor them to your application.",
            "  Consult README.Docker.md for information about using the generated files.",
            "",
            "What's next?",
            `  Start your application by running → docker compose up --build`,
            `  Your application will be available at http://localhost:${port}`,
          ),
        );
      };
    const defaults = {
      node: { version: "22.11.0", command: "node server.js", port: "3000" },
      python: { version: "3.12", command: "python app.py", port: "8000" },
    };
    const askPort = (platform: "node" | "python", version: string, command: string) =>
      ask(`? What port does your server listen on? (${defaults[platform].port}) `, (next, answer) =>
        finish(platform, version, command, answer.trim() || defaults[platform].port)(next),
      );
    const askCommand = (platform: "node" | "python", version: string) =>
      ask(`? What command do you want to use to start the app? (${defaults[platform].command}) `, (_next, answer) => ({
        prompt: askPort(platform, version, answer.trim() || defaults[platform].command),
      }));
    const askVersion = (platform: "node" | "python") =>
      ask(`? What version of ${PLATFORMS[platform]} do you want to use? (${defaults[platform].version}) `, (_next, answer) => ({
        prompt: askCommand(platform, answer.trim() || defaults[platform].version),
      }));
    return {
      out: intro,
      prompt: ask(`? What application platform does your project use? [Node, Python] (${PLATFORMS[detected]}) `, (_next, answer) => {
        const choice = (answer.trim().toLowerCase() || detected) as string;
        if (choice !== "node" && choice !== "python")
          return fail(`ERROR: "${answer}" n'est pas proposé dans ce terminal d'entraînement (Node ou Python).`);
        return { prompt: askVersion(choice) };
      }),
    };
  },
};

export const toolCommands: CommandDef[] = [save, load, scoutQuickview, scoutCves, scoutRecommendations, imagetools, init];

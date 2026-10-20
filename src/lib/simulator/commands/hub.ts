import { has, value, values } from "../args";
import { ask, type CommandDef, fail, join, ok, type Outcome } from "../command";
import { truncate, table } from "../format";
import { catalog } from "../catalog";
import { canPush, findImage, parseImageRef, publish } from "../state";
import type { SimState } from "../types";
import { layerIds } from "./images";

const REGISTRY = "https://index.docker.io/v1/";

const search: CommandDef = {
  path: "search",
  spec: {
    usage: "docker search [OPTIONS] TERM",
    description: "Search Docker Hub for images",
    minArgs: 1,
    maxArgs: 1,
    options: [
      { names: ["-f", "--filter"], value: "filter", description: "Filter output based on conditions provided" },
      { names: ["--limit"], value: "int", description: "Max number of search results" },
      { names: ["--no-trunc"], description: "Don't truncate output" },
    ],
  },
  run: ({ state, parsed }) => {
    const term = parsed.args[0].toLowerCase();
    const officialOnly = values(parsed, "--filter").includes("is-official=true");
    const rows: [string, string, number, boolean][] = [];
    for (const [name, entry] of Object.entries(catalog)) {
      if (!name.includes(term)) continue;
      rows.push([name, entry.description, entry.stars, true]);
      rows.push([`bitnami/${name}`, `Bitnami container image for ${name}`, Math.round(entry.stars / 40), false]);
    }
    for (const [repo, entry] of Object.entries(state.hub)) if (repo.includes(term) && !entry.private) rows.push([repo, "", 0, false]);
    const filtered = rows.filter((row) => !officialOnly || row[3]).slice(0, Number(value(parsed, "--limit") ?? 25));
    return ok(
      table(
        ["NAME", "DESCRIPTION", "STARS", "OFFICIAL"],
        filtered.map(([name, description, stars, official]) => [
          name,
          has(parsed, "--no-trunc") ? description : truncate(description, 45),
          String(stars),
          official ? "[OK]" : "",
        ]),
      ),
    );
  },
};

function succeed(state: SimState, username: string): Outcome {
  state.auth = username;
  return ok("\nLogin Succeeded");
}

const login: CommandDef = {
  path: "login",
  spec: {
    usage: "docker login [OPTIONS] [SERVER]",
    description: "Authenticate to a registry.\nDefaults to Docker Hub if no server is specified.",
    maxArgs: 1,
    options: [
      { names: ["-p", "--password"], value: "string", description: "Password or Personal Access Token (PAT)" },
      { names: ["--password-stdin"], description: "Take the Password or Personal Access Token (PAT) from stdin" },
      { names: ["-u", "--username"], value: "string", description: "Username" },
    ],
  },
  run: ({ state, parsed }) => {
    const username = value(parsed, "--username");
    const password = value(parsed, "--password");
    if (state.auth && !username) {
      return ok(
        `Authenticating with existing credentials... [Username: ${state.auth}]\n\ni Info → To login with a different account, run 'docker logout' followed by 'docker login'\n\n\nLogin Succeeded`,
      );
    }
    if (username && password)
      return {
        ...succeed(state, username),
        out: "WARNING! Using --password via the CLI is insecure. Use --password-stdin.\n\nLogin Succeeded",
      };
    const askPassword = (user: string) =>
      ask("Password: ", (next, answer) => (answer ? succeed(next, user) : fail("Error: Password Required")), true);
    if (username) return { prompt: askPassword(username) };
    return {
      out: `\nLog in with your Docker ID or email address to push and pull images from Docker Hub. If you don't have a Docker ID, head over to https://hub.docker.com/ to create one.
You can log in with your password or a Personal Access Token (PAT). Using a limited-scope PAT grants better security and is required for organizations using SSO. Learn more at https://docs.docker.com/go/access-tokens/
`,
      prompt: ask("Username: ", (_next, answer) =>
        answer.trim() ? { prompt: askPassword(answer.trim()) } : fail("Error: Username Required"),
      ),
    };
  },
};

const logout: CommandDef = {
  path: "logout",
  spec: {
    usage: "docker logout [SERVER]",
    description: "Log out from a registry.\nIf no server is specified, the default is defined by the daemon.",
    maxArgs: 1,
  },
  run: ({ state }) => {
    state.auth = null;
    return ok(`Removing login credentials for ${REGISTRY}`);
  },
};

const push: CommandDef = {
  path: "image push",
  aliases: ["push"],
  spec: {
    usage: "docker push [OPTIONS] NAME[:TAG]",
    description: "Upload an image to a registry",
    minArgs: 1,
    maxArgs: 1,
    options: [
      { names: ["-a", "--all-tags"], description: "Push all tags of an image to the repository" },
      { names: ["-q", "--quiet"], description: "Suppress verbose output" },
    ],
  },
  run: ({ state, parsed }) => {
    const input = parsed.args[0];
    const allTags = has(parsed, "--all-tags");
    if (allTags && input.includes(":")) return fail("tag can't be used with --all-tags/-a");
    const { repo, tag } = parseImageRef(input);
    const tags = allTags
      ? state.images
          .flatMap((image) => image.tags)
          .filter((ref) => ref.startsWith(`${repo}:`))
          .map((ref) => ref.slice(repo.length + 1))
      : findImage(state, input)
        ? [tag]
        : [];
    if (tags.length === 0) return fail(`An image does not exist locally with the tag: ${repo}`);

    const fullRepo = repo.includes("/") ? repo : `library/${repo}`;
    const layers = layerIds(repo, 4);
    const header = `The push refers to repository [docker.io/${fullRepo}]`;
    if (!canPush(state, repo)) {
      return fail(join(header, ...layers.map((layer) => `${layer}: Preparing`), "denied: requested access to the resource is denied"));
    }
    const lines = [header];
    for (const current of tags) {
      const known = Object.keys(state.hub[repo]?.tags ?? {}).length > 0;
      lines.push(...layers.map((layer) => `${layer}: ${known ? "Layer already exists" : "Pushed"}`));
      lines.push(`${current}: digest: sha256:${layerIds(`${repo}:${current}`, 8).join("")} size: 1782`);
      publish(state, repo, current, findImage(state, `${repo}:${current}`)!);
    }
    return ok(lines.join("\n"));
  },
};

export const hubCommands: CommandDef[] = [search, login, logout, push];

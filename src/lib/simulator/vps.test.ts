import { describe, expect, it } from "vitest";
import { createEnvironment, createState, execute, type ExecResult, promptFor, type SimState } from ".";
import type { SimulatorSetup } from "./state";

/** Exécute des lignes ; les réponses aux questions sont fournies dans `answers`, dans l'ordre. */
function session(state: SimState, lines: string[], answers: string[] = []) {
  let current = state;
  let last: ExecResult = execute(current, "");
  const queue = [...answers];
  for (const line of lines) {
    last = execute(current, line);
    while (last.prompt && !last.prompt.blocking) last = last.prompt.respond(last.state, queue.shift() ?? "");
    current = last.state;
  }
  return { state: current, output: last.output, exitCode: last.exitCode };
}

const VPS: SimulatorSetup = {
  machines: { "vps-prod": { ip: "203.0.113.10", names: ["vps.acme.fr"], user: "deploy", password: "Vps!2024" } },
};

describe("build : cache par couche", () => {
  const files = {
    Dockerfile: 'FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nCMD ["node", "server.js"]',
    "package.json": "{}",
    "server.js": "v1",
  };

  it("ne relance que les couches dont les entrées ont changé", () => {
    let state = session(createState({ files }), ["docker build -t app ."]).state;
    state = session(state, ['echo "// v2" >> server.js']).state;
    const rebuild = session(state, ["docker build -t app ."]).output;
    expect(rebuild).toMatch(/CACHED \[3\/5\] COPY package\*\.json/);
    expect(rebuild).toMatch(/CACHED \[4\/5\] RUN npm ci/);
    expect(rebuild).not.toMatch(/CACHED \[5\/5\] COPY \. \./);
  });

  it("relance l'installation si le code est copié avant les dépendances", () => {
    const bad = { ...files, Dockerfile: 'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nCMD ["node", "server.js"]' };
    let state = session(createState({ files: bad }), ["docker build -t app ."]).state;
    state = session(state, ['echo "// v2" >> server.js']).state;
    expect(session(state, ["docker build -t app ."]).output).not.toMatch(/CACHED \[4\/4\] RUN npm ci/);
  });

  it("applique les exceptions du .dockerignore", () => {
    const state = createState({
      files: {
        Dockerfile: "FROM nginx:alpine\nCOPY . /usr/share/nginx/html",
        ".dockerignore": "*.md\n!README.md\n**/secret.txt",
        "README.md": "lisez-moi",
        "NOTES.md": "notes",
        "docs/secret.txt": "x",
        "secret.txt": "y",
        "index.html": "<h1>ok</h1>",
      },
    });
    const image = session(state, ["docker build -t site ."]).state.images.find((candidate) => candidate.tags.includes("site:latest"))!;
    const copied = Object.keys(image.fs).filter((path) => path.startsWith("/usr/share/nginx/html/"));
    expect(copied).toContain("/usr/share/nginx/html/README.md");
    expect(copied).toContain("/usr/share/nginx/html/index.html");
    expect(copied.some((path) => path.includes("NOTES") || path.includes("secret"))).toBe(false);
  });
});

describe("ssh et VPS", () => {
  it("se connecte par mot de passe après avoir accepté l'empreinte", () => {
    const result = session(createState(VPS), ["ssh deploy@203.0.113.10"], ["yes", "Vps!2024"]);
    expect(result.output).toContain("Welcome to Ubuntu");
    expect(promptFor(result.state)).toBe("deploy@vps-prod:~$");
    const back = session(result.state, ["exit"]);
    expect(back.output).toContain("Connection to 203.0.113.10 closed.");
    expect(promptFor(back.state)).toBe("alex@pc:~/projet$");
  });

  it("refuse un mauvais mot de passe et une empreinte refusée", () => {
    expect(session(createState(VPS), ["ssh deploy@203.0.113.10"], ["yes", "faux"]).output).toContain("Permission denied");
    expect(session(createState(VPS), ["ssh deploy@203.0.113.10"], ["no"]).output).toContain("Host key verification failed.");
    expect(session(createState(VPS), ["ssh deploy@inconnu.example"]).output).toContain("Could not resolve hostname");
  });

  it("installe une clé avec ssh-keygen et ssh-copy-id, puis se connecte sans mot de passe", () => {
    let state = session(createState(VPS), ['ssh-keygen -t ed25519 -C "alex@acme.fr"'], ["", "", ""]).state;
    expect(state.files["/home/alex/.ssh/id_ed25519.pub"]).toContain("alex@acme.fr");
    state = session(state, ["ssh-copy-id deploy@vps.acme.fr"], ["yes", "Vps!2024"]).state;
    const login = session(state, ["ssh deploy@vps.acme.fr"]);
    expect(login.output).toContain("Welcome to Ubuntu");
  });

  it("installe Docker sur le serveur et gère le groupe docker", () => {
    let state = session(createState(VPS), ["ssh deploy@203.0.113.10"], ["yes", "Vps!2024"]).state;
    expect(session(state, ["docker ps"]).output).toContain("Command 'docker' not found");
    state = session(state, ["curl -fsSL https://get.docker.com -o get-docker.sh", "sudo sh get-docker.sh"], ["Vps!2024"]).state;
    expect(session(state, ["docker ps"]).output).toContain("permission denied while trying to connect");
    expect(session(state, ["sudo docker ps"]).exitCode).toBe(0);
    state = session(state, ["sudo usermod -aG docker $USER"]).state;
    expect(session(state, ["docker ps"]).exitCode).toBe(1);
    state = session(state, ["exit", "ssh deploy@203.0.113.10"], ["Vps!2024"]).state;
    expect(session(state, ["docker ps"]).exitCode).toBe(0);
  });

  it("pilote le moteur du VPS depuis le poste avec un contexte ssh", () => {
    const state = createEnvironment({
      sshKey: true,
      machines: {
        "vps-prod": { ...VPS.machines!["vps-prod"], dockerInstalled: true, dockerGroup: true, authorizeLocalKey: true, knownByLocal: true },
      },
    });
    let result = session(state, [
      'docker context create vps --docker "host=ssh://deploy@203.0.113.10"',
      "docker context use vps",
      "docker run -d --name web -p 80:80 nginx",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.state.containers).toHaveLength(0);
    expect(result.state.machines["vps-prod"].data.containers[0].name).toBe("web");
    expect(session(result.state, ["curl http://203.0.113.10"]).output).toContain("Welcome to nginx!");
    result = session(result.state, ["docker context use default", "docker ps -q"]);
    expect(result.output).toBe("");
  });

  it("refuse le contexte distant sans clé autorisée", () => {
    const state = createEnvironment({
      sshKey: true,
      machines: { "vps-prod": { ...VPS.machines!["vps-prod"], dockerInstalled: true, knownByLocal: true } },
    });
    expect(session(state, ["docker -H ssh://deploy@203.0.113.10 ps"]).output).toContain("Permission denied (publickey,password)");
  });

  it("n'expose pas un port lié à 127.0.0.1", () => {
    const state = createEnvironment({
      machines: {
        "vps-prod": {
          ...VPS.machines!["vps-prod"],
          dockerInstalled: true,
          dockerGroup: true,
          commands: [
            "docker run -d --name db -p 127.0.0.1:5432:5432 -e POSTGRES_PASSWORD=x postgres:16",
            "docker run -d --name web -p 8080:80 nginx",
          ],
        },
      },
    });
    expect(session(state, ["nc -zv 203.0.113.10 5432"]).exitCode).toBe(1);
    expect(session(state, ["nc -zv 203.0.113.10 8080"]).exitCode).toBe(0);
  });

  it("copie un fichier avec scp", () => {
    const state = createState({ ...VPS, files: { "compose.yaml": "services: {}" } });
    const result = session(state, ["scp compose.yaml deploy@203.0.113.10:~/app/"], ["yes", "Vps!2024"]);
    expect(result.exitCode).toBe(0);
    expect(result.state.machines["vps-prod"].data.files["/home/deploy/app/compose.yaml"]).toBe("services: {}");
  });
});

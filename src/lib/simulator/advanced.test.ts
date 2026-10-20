import { describe, expect, it } from "vitest";
import { createEnvironment, createState, execute, promptFor, type SimState } from ".";

function run(state: SimState, ...lines: string[]) {
  let current = state;
  let last = execute(current, "");
  for (const line of lines) {
    last = execute(current, line);
    current = last.state;
  }
  return last;
}

const API = {
  "server.js": "require('express')",
  "package.json": "{}",
  Dockerfile: 'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nUSER node\nEXPOSE 3000\nCMD ["node", "server.js"]',
};

const COMPOSE = `services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:\${DB_PASSWORD}@db:5432/app
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
`;

const app = { requiredEnv: ["DATABASE_URL"], urlEnv: ["DATABASE_URL"] };

describe("compose réel", () => {
  it("lit compose.yaml, interpole .env et démarre la stack", () => {
    const state = createState({ files: { ...API, "compose.yaml": COMPOSE, ".env": "DB_PASSWORD=s3cret" }, app });
    const result = run(state, "docker compose up -d");
    expect(result.exitCode).toBe(0);
    const api = result.state.containers.find((container) => container.name === "projet-api-1")!;
    expect(api.status).toBe("running");
    expect(run(result.state, "curl localhost:3000").output).toBe("Hello from Docker!");
    expect(run(result.state, "docker compose ps").output).toContain("(healthy)");
  });

  it("signale une variable manquante : la base refuse de démarrer", () => {
    const result = run(createState({ files: { ...API, "compose.yaml": COMPOSE }, app }), "docker compose up -d");
    expect(result.output).toContain('The "DB_PASSWORD" variable is not set');
    expect(result.output).toContain("dependency failed to start: container projet-db-1 exited (1)");
    expect(run(result.state, "docker compose logs db").output).toContain("superuser password is not specified");
  });

  it("fait planter l'application si le mot de passe ne correspond pas", () => {
    const file = COMPOSE.replace("POSTGRES_PASSWORD: ${DB_PASSWORD}", "POSTGRES_PASSWORD: autre");
    const result = run(createState({ files: { ...API, "compose.yaml": file, ".env": "DB_PASSWORD=s3cret" }, app }), "docker compose up -d");
    expect(run(result.state, "docker compose logs api").output).toContain('password authentication failed for user "postgres"');
  });

  it("exige un healthcheck pour service_healthy", () => {
    const file = COMPOSE.replace(/    healthcheck:\n.*\n/, "");
    const result = run(createState({ files: { ...API, "compose.yaml": file, ".env": "DB_PASSWORD=x" }, app }), "docker compose up -d");
    expect(result.output).toContain("has no healthcheck configured");
  });

  it("refuse un fichier invalide avec un message YAML", () => {
    const result = run(
      createState({ files: { "compose.yaml": "services:\n  web:\n  image: nginx\n    ports: []" } }),
      "docker compose up -d",
    );
    expect(result.exitCode).toBe(1);
    expect(result.output).toMatch(/^yaml: line \d+/);
  });

  it("fusionne plusieurs fichiers et gère les profils", () => {
    const files = {
      "compose.yaml": "services:\n  web:\n    image: nginx\n  adminer:\n    image: nginx\n    profiles: [tools]\n",
      "compose.prod.yaml": "services:\n  web:\n    ports:\n      - 80:80\n",
    };
    const merged = run(createState({ files }), "docker compose -f compose.yaml -f compose.prod.yaml config");
    expect(merged.output).toContain("80:80");
    expect(run(createState({ files }), "docker compose config --services").output).toBe("web");
    expect(run(createState({ files }), "docker compose --profile tools config --services").output).toBe("web\nadminer");
  });
});

describe("applications et réseaux", () => {
  it("plante si la base n'est pas joignable puis repart quand elle le devient", () => {
    let state = createState({ customImages: [{ ref: "api" }], app, networks: ["net"] });
    state = run(
      state,
      "docker run -d --name api --network net --restart unless-stopped -e DATABASE_URL=postgres://postgres:pw@db:5432/app api",
    ).state;
    expect(state.containers[0].status).toBe("restarting");
    expect(run(state, "docker logs api").output).toContain("getaddrinfo ENOTFOUND db");
    state = run(state, "docker run -d --name db --network net -e POSTGRES_PASSWORD=pw postgres").state;
    expect(state.containers.find((container) => container.name === "api")!.status).toBe("running");
  });

  it("n'a pas de DNS sur le réseau bridge par défaut", () => {
    const state = run(
      createState({ customImages: [{ ref: "api" }], app }),
      "docker run -d --name db -e POSTGRES_PASSWORD=pw postgres",
      "docker run -d --name api -e DATABASE_URL=postgres://postgres:pw@db:5432/app api",
    ).state;
    expect(state.containers.find((container) => container.name === "api")!.status).toBe("exited");
  });

  it("lit un fichier --env-file et respecte USER", () => {
    const state = createState({ files: { ...API, ".env": "DATABASE_URL=postgres://postgres:pw@db:5432/app" } });
    const built = run(state, "docker build -t api .", "docker run -d --name api --env-file .env api").state;
    expect(run(built, "docker exec api whoami").output).toBe("node");
    expect(run(built, "docker exec api printenv").output).toContain("DATABASE_URL=");
  });
});

describe("Docker Hub en équipe", () => {
  it("publie dans une organisation et protège les dépôts privés", () => {
    const state = createState({
      customImages: [{ ref: "api:1.0" }],
      orgs: ["acme"],
      auth: "alex",
      hub: { "acme/secret": { private: true, tags: ["1.0"] } },
    });
    expect(run(state, "docker tag api:1.0 acme/api:1.0", "docker push acme/api:1.0").exitCode).toBe(0);
    expect(run(state, "docker tag api:1.0 other/api:1.0", "docker push other/api:1.0").output).toContain("denied");
    expect(run(state, "docker pull acme/secret:1.0").exitCode).toBe(0);
    expect(run(run(state, "docker logout").state, "docker pull acme/secret:1.0").output).toContain("pull access denied");
  });

  it("construit et pousse une image multi-plateforme", () => {
    const state = createState({ files: API, auth: "alex" });
    const result = run(state, "docker buildx build --platform linux/amd64,linux/arm64 -t alex/api:1.0 --push .");
    expect(result.exitCode).toBe(0);
    expect(run(result.state, "docker buildx imagetools inspect alex/api:1.0").output).toContain("linux/arm64");
  });
});

describe("outils", () => {
  it("sauvegarde et recharge une image", () => {
    const state = run(createState({ images: ["nginx"] }), "docker save -o nginx.tar nginx", "docker rmi nginx").state;
    expect(run(state, "docker load -i nginx.tar").output).toBe("Loaded image: nginx:latest");
  });

  it("compare les vulnérabilités avec docker scout", () => {
    const state = createState({ images: ["node:22", "node:22-alpine"] });
    expect(run(state, "docker scout quickview node:22").output).toContain("node:22-alpine");
    expect(run(state, "docker scout recommendations node:22-alpine").output).toContain("No recommendation");
  });

  it("génère les fichiers avec docker init", () => {
    let result = run(createState({ files: { "package.json": "{}" } }), "docker init");
    for (const answer of ["", "", "", ""]) result = result.prompt!.respond(result.state, answer);
    expect(result.state.files["/home/alex/projet/Dockerfile"]).toContain("FROM node:${NODE_VERSION}-alpine");
    expect(run(result.state, "docker compose up -d --build").exitCode).toBe(0);
  });

  it("prépare un environnement avec des commandes", () => {
    const state = createEnvironment({ images: ["nginx"], commands: ["docker run -d --name web nginx"] });
    expect(state.containers[0].name).toBe("web");
    expect(promptFor(state)).toBe("alex@pc:~/projet$");
  });
});

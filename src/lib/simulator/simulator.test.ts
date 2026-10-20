import { describe, expect, it } from "vitest";
import { complete, createState, execute, promptFor, type SimState } from ".";

function run(state: SimState, ...lines: string[]) {
  let current = state;
  let last = execute(current, "");
  for (const line of lines) {
    last = execute(current, line);
    current = last.state;
  }
  return last;
}

describe("simulateur Docker", () => {
  it("télécharge l'image manquante puis lance le conteneur", () => {
    const result = run(createState(), "docker run -d --name web nginx");
    expect(result.output).toContain("Unable to find image 'nginx:latest' locally");
    expect(result.state.containers[0]).toMatchObject({ name: "web", status: "running" });
  });

  it("reproduit les erreurs de la vraie CLI", () => {
    const state = run(createState(), "docker run -d -p 8080:80 --name web nginx").state;
    expect(run(state, "docker run -d --name web nginx").output).toContain('The container name "/web" is already in use');
    expect(run(state, "docker run -d -p 8080:80 nginx").output).toContain("port is already allocated");
    expect(run(state, "docker rm web").output).toContain("container is running");
    expect(run(state, "docker psx").output).toBe("docker: 'psx' is not a docker command.\nSee 'docker --help'");
    expect(run(state, "docker run --foo nginx").output).toContain("unknown flag: --foo");
    expect(run(state, "dockr ps")).toMatchObject({ exitCode: 127, output: "dockr: command not found" });
  });

  it("ouvre un shell interactif et le referme avec exit", () => {
    const inside = run(createState(), "docker run -it --rm ubuntu bash").state;
    expect(promptFor(inside)).toMatch(/^root@[0-9a-f]{12}:\/#$/);
    expect(run(inside, "cat /etc/os-release").output).toContain("Ubuntu");
    const outside = run(inside, "exit").state;
    expect(outside.shell).toBeNull();
    expect(outside.containers).toHaveLength(0);
  });

  it("refuse bash sur une image Alpine", () => {
    const withServer = createState({ customImages: [{ ref: "api" }], containers: [{ name: "api", image: "api" }] });
    expect(run(withServer, "docker exec -it api bash").output).toContain('exec: "bash": executable file not found');
    expect(run(withServer, "docker exec -it api sh").state.shell).not.toBeNull();
  });

  it("demande une confirmation pour les commandes prune", () => {
    const state = createState({ containers: [{ name: "old", image: "hello-world", status: "exited" }] });
    const result = run(state, "docker container prune");
    expect(result.prompt?.label).toContain("[y/N]");
    const confirmed = result.prompt!.respond(result.state, "y");
    expect(confirmed.state.containers).toHaveLength(0);
  });

  it("gère la connexion à Docker Hub et la publication", () => {
    const state = createState({ customImages: [{ ref: "mon-app:1.0" }] });
    expect(run(state, "docker tag mon-app:1.0 alex/mon-app:1.0", "docker push alex/mon-app:1.0").output).toContain("denied");
    const login = run(state, "docker login");
    const password = login.prompt!.respond(login.state, "alex");
    const logged = password.prompt!.respond(password.state, "secret");
    expect(logged.state.auth).toBe("alex");
    expect(run(logged.state, "docker tag mon-app:1.0 alex/mon-app:1.0", "docker push alex/mon-app:1.0").exitCode).toBe(0);
  });

  it("construit une image depuis le Dockerfile et signale les fichiers manquants", () => {
    const state = createState({ files: { Dockerfile: "FROM node:22-alpine\nCOPY server.js .\nCMD node server.js", "server.js": "" } });
    expect(run(state, "docker build -t app .").state.images.some((image) => image.tags.includes("app:latest"))).toBe(true);
    const broken = createState({ files: { Dockerfile: "FROM node:22-alpine\nCOPY absent.js ." } });
    expect(run(broken, "docker build .").output).toContain('"/absent.js": not found');
    expect(run(createState(), "docker build .").output).toContain("open Dockerfile: no such file or directory");
  });

  it("bloque le terminal pendant docker logs -f jusqu'à Ctrl+C", () => {
    const result = run(createState({ containers: [{ name: "web", image: "nginx" }] }), "docker logs -f web");
    expect(result.prompt?.blocking).toBe(true);
    expect(result.prompt!.interrupt!(result.state).prompt).toBeUndefined();
  });

  it("complète les commandes avec Tab", () => {
    const state = createState({ containers: [{ name: "web", image: "nginx" }] });
    expect(complete(state, "docker vol").line).toBe("docker volume ");
    expect(complete(state, "docker logs w").line).toBe("docker logs web ");
  });
});

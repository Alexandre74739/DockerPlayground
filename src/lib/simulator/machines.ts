import { cloneState } from "./state";
import type { ExecResult, Machine, MachineData, Prompt, SimState } from "./types";

/**
 * Plusieurs machines : le poste local et des serveurs (VPS) joignables en SSH.
 * Les données de la machine active sont à la racine de l'état ; les autres
 * sont conservées dans `machines[id].data`.
 */

const MACHINE_KEYS = [
  "user",
  "hostname",
  "cwd",
  "files",
  "dirs",
  "images",
  "containers",
  "volumes",
  "networks",
  "buildCache",
  "layerCache",
  "auth",
  "context",
  "contexts",
] as const satisfies readonly (keyof MachineData)[];

const ENGINE_KEYS = ["images", "containers", "volumes", "networks", "buildCache", "layerCache"] as const;

export function snapshot(state: SimState): MachineData {
  return Object.fromEntries(MACHINE_KEYS.map((key) => [key, state[key]])) as MachineData;
}

function load(state: SimState, data: MachineData, keys: readonly (keyof MachineData)[]) {
  for (const key of keys) (state as Record<string, unknown>)[key] = data[key];
}

/** Bascule sur une autre machine (connexion ssh, déconnexion). */
export function activate(state: SimState, id: string) {
  state.machines[state.machine].data = snapshot(state);
  load(state, state.machines[id].data, MACHINE_KEYS);
  state.machine = id;
}

/** Données à jour d'une machine, active ou non. */
export function machineData(state: SimState, id: string): MachineData {
  return id === state.machine ? snapshot(state) : state.machines[id].data;
}

export function current(state: SimState): Machine {
  return state.machines[state.machine];
}

export function homeOf(user: string): string {
  return user === "root" ? "/root" : `/home/${user}`;
}

export function findMachine(state: SimState, host: string): string | undefined {
  return Object.entries(state.machines).find(([, machine]) => machine.ip === host || machine.names.includes(host))?.[0];
}

/**
 * Exécute une commande sur le moteur Docker d'une autre machine (contexte ssh) :
 * fichiers et configuration restent ceux du poste, seul le moteur change.
 */
export function onEngine(state: SimState, id: string, run: (target: SimState) => ExecResult): ExecResult {
  if (id === state.machine) return run(state);
  const local = Object.fromEntries(ENGINE_KEYS.map((key) => [key, state[key]]));
  const target = cloneState(state);
  load(target, state.machines[id].data, ENGINE_KEYS);
  const result = run(target);
  const next = result.state;
  for (const key of ENGINE_KEYS) (next.machines[id].data as Record<string, unknown>)[key] = next[key];
  load(next, local as unknown as MachineData, ENGINE_KEYS);
  const prompt = result.prompt && {
    ...result.prompt,
    respond: (s: SimState, answer: string) => onEngine(s, id, (inner) => result.prompt!.respond(inner, answer)),
    interrupt: result.prompt.interrupt && ((s: SimState) => onEngine(s, id, (inner) => result.prompt!.interrupt!(inner))),
  };
  return { ...result, state: next, prompt };
}

/**
 * Variante « sur place » pour les commandes docker, qui modifient l'état directement.
 * Les questions interactives éventuelles continuent sur le moteur distant.
 */
export function withEngine<T extends { prompt?: Prompt }>(state: SimState, id: string, run: () => T): T {
  if (id === state.machine) return run();
  const local = Object.fromEntries(ENGINE_KEYS.map((key) => [key, state[key]])) as unknown as MachineData;
  load(state, state.machines[id].data, ENGINE_KEYS);
  const outcome = run();
  for (const key of ENGINE_KEYS) (state.machines[id].data as Record<string, unknown>)[key] = state[key];
  load(state, local, ENGINE_KEYS);
  if (!outcome.prompt) return outcome;
  const prompt = outcome.prompt;
  return {
    ...outcome,
    prompt: {
      ...prompt,
      respond: (s: SimState, answer: string) => onEngine(s, id, (inner) => prompt.respond(inner, answer)),
      interrupt: prompt.interrupt && ((s: SimState) => onEngine(s, id, (inner) => prompt.interrupt!(inner))),
    },
  };
}

/** Clé publique de l'utilisateur courant, si elle existe. */
export function publicKey(state: SimState): string | undefined {
  return state.files[`${homeOf(state.user)}/.ssh/id_ed25519.pub`]?.trim();
}

export function knowsHost(state: SimState, host: string): boolean {
  return (state.files[`${homeOf(state.user)}/.ssh/known_hosts`] ?? "").split("\n").some((line) => line.split(" ")[0] === host);
}

export function rememberHost(state: SimState, host: string) {
  const path = `${homeOf(state.user)}/.ssh/known_hosts`;
  const previous = state.files[path] ?? "";
  state.files[path] = `${previous}${host} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHb3rP0Fq2sXvKZ1pYy8eW4Lm6Tn0Qd5Rj7Uk9Sa2Vc\n`;
  if (!state.dirs.includes(`${homeOf(state.user)}/.ssh`)) state.dirs.push(`${homeOf(state.user)}/.ssh`);
}

export function fingerprint(host: string): string {
  let hash = 7;
  for (const char of host) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `SHA256:${hash.toString(36)}Xq3v9Lr2mT8kPz1aWc5Yd7Hn4Fb6Js0Ue`;
}

/** Message d'erreur si la CLI ne peut pas utiliser Docker sur la machine courante. */
export function dockerAccessError(state: SimState, asRoot: boolean): string | undefined {
  const machine = current(state);
  if (!machine.dockerInstalled) {
    return `Command 'docker' not found, but can be installed with:

sudo snap install docker         # version 27.2.0, or
sudo apt  install docker.io      # version 26.1.3-0ubuntu1~24.04.1
sudo apt  install podman-docker  # version 4.9.3+ds1-1ubuntu0.2

See 'snap info docker' for additional versions.`;
  }
  if (!asRoot && state.user !== "root" && !machine.dockerGroup.includes(state.user)) {
    return `permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Get "http://%2Fvar%2Frun%2Fdocker.sock/v1.47/containers/json": dial unix /var/run/docker.sock: connect: permission denied`;
  }
  return undefined;
}

/** Vérifie qu'un moteur distant est joignable en ssh pour la CLI (contexte ou -H). */
export function remoteEngineError(state: SimState, endpoint: string): { id: string } | { error: string } {
  const match = endpoint.match(/^ssh:\/\/(?:([^@]+)@)?([^:/]+)/);
  if (!match) return { error: `unable to parse docker host \`${endpoint}\`` };
  const [, user = state.user, host] = match;
  const id = findMachine(state, host);
  const wrap = (stderr: string) =>
    `error during connect: Get "http://docker.example.com/v1.47/containers/json": command [ssh -o ConnectTimeout=30 -T -l ${user} -- ${host} docker system dial-stdio] has exited with exit status 255, make sure the URL is valid, and Docker 18.09 or later is installed on the remote host: stderr=${stderr}`;
  if (!id) return { error: wrap(`ssh: Could not resolve hostname ${host}: Name or service not known`) };
  const machine = state.machines[id];
  if (!knowsHost(state, host)) return { error: wrap("Host key verification failed.") };
  const key = publicKey(state);
  if (!key || !machine.authorizedKeys.includes(key) || user !== machine.data.user) {
    return { error: wrap(`${user}@${host}: Permission denied (publickey${machine.passwordAuth ? ",password" : ""}).`) };
  }
  if (!machine.dockerInstalled) return { error: wrap("bash: line 1: docker: command not found") };
  if (user !== "root" && !machine.dockerGroup.includes(user)) {
    return { error: wrap("permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock") };
  }
  return { id };
}

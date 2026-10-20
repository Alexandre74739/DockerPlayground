import { loadCompose, parseEnvFile } from "../simulator/compose-file";
import { execute, runHostCommand, type SimState } from "../simulator";
import { activate, machineData } from "../simulator/machines";
import { PROJECT_DIR } from "../simulator/state";
import type { Container, Image } from "../simulator/types";

/** Outils de vérification des cas pratiques : ils ne lisent que l'état du simulateur. */

export const projectFile = (state: SimState, path: string): string | undefined => state.files[`${PROJECT_DIR}/${path}`];

export function container(state: SimState, name: string): Container | undefined {
  return state.containers.find((candidate) => candidate.name === name || candidate.compose?.service === name);
}

export const isRunning = (state: SimState, name: string) => container(state, name)?.status === "running";

export function image(state: SimState, ref: string): Image | undefined {
  const full = ref.includes(":") ? ref : `${ref}:latest`;
  return state.images.find((candidate) => candidate.tags.includes(full));
}

export function env(target: Container | undefined, name: string): string | undefined {
  return target?.env.find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1);
}

/** Réponse HTTP telle que l'obtiendrait curl, sans modifier l'état. */
export function http(state: SimState, url: string): string | undefined {
  const result = runHostCommand(structuredClone(state), ["curl", "-s", url]);
  return result.code === 0 ? result.out : undefined;
}

export function compose(state: SimState) {
  const project = loadCompose({ ...state, cwd: PROJECT_DIR }, { files: [], profiles: [] });
  return "error" in project ? undefined : project;
}

export function dotenv(state: SimState): Record<string, string> {
  return parseEnvFile(projectFile(state, ".env") ?? "");
}

/** Espace disque occupé, comme le calcule docker system df. */
export function diskUsage(state: SimState): number {
  return (
    state.images.reduce((sum, candidate) => sum + candidate.size, 0) +
    state.buildCache +
    state.volumes.length * 60_000_000 +
    state.containers.length * 1_100_000
  );
}

export const MB = 1_000_000;
export const GB = 1_000_000_000;

// ─── Serveurs distants ─────────────────────────────────────────────────────

/** Données à jour d'une machine (poste ou serveur). */
export function machine(state: SimState, id: string) {
  return machineData(state, id);
}

export function remoteContainer(state: SimState, id: string, name: string): Container | undefined {
  return machine(state, id).containers.find((candidate) => candidate.name === name || candidate.compose?.service === name);
}

/** Résultat d'une commande lancée depuis le poste, sans modifier l'état. */
export function probe(state: SimState, argv: string[]): { out: string; code: number } {
  const local = structuredClone(state);
  while (local.machine !== "local") activate(local, local.sshStack.pop() ?? "local");
  return runHostCommand(local, argv);
}

/**
 * Rejoue un build après une modification du code seul : la couche
 * d'installation des dépendances doit sortir du cache.
 */
export function rebuildAfterCodeChange(state: SimState, tag: string, file: string): string {
  let local = structuredClone(state);
  while (local.machine !== "local") activate(local, local.sshStack.pop() ?? "local");
  local.files[`${PROJECT_DIR}/${file}`] = `${local.files[`${PROJECT_DIR}/${file}`] ?? ""}\n// modification\n`;
  local = { ...local, cwd: PROJECT_DIR, context: "default" };
  return execute(local, `docker build -t ${tag} .`).output;
}

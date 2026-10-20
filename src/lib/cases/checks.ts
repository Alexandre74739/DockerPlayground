import { loadCompose, parseEnvFile } from "../simulator/compose-file";
import { runHostCommand, type SimState } from "../simulator";
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

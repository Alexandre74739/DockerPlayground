import { has, value } from "../args";
import { type CommandDef, confirm, daemonError, fail, join, ok, type Outcome } from "../command";
import { humanSize, json, MB, randomHex, shortId, table } from "../format";
import { findContainer } from "../state";
import type { SimState } from "../types";

// ─── Volumes ───────────────────────────────────────────────────────────────

const volumeUsers = (state: SimState, name: string) =>
  state.containers.filter((container) => container.mounts.some((mount) => mount.type === "volume" && mount.source === name));

const volumeCreate: CommandDef = {
  path: "volume create",
  spec: {
    usage: "docker volume create [OPTIONS] [VOLUME]",
    description: "Create a volume",
    maxArgs: 1,
    options: [{ names: ["-d", "--driver"], value: "string", description: 'Specify volume driver name (default "local")' }],
  },
  run: ({ state, parsed }) => {
    const name = parsed.args[0] ?? randomHex(64);
    if (!state.volumes.some((volume) => volume.name === name)) state.volumes.push({ name, createdAt: Date.now() });
    return ok(name);
  },
};

const volumeLs: CommandDef = {
  path: "volume ls",
  aliases: ["volume list"],
  spec: {
    usage: "docker volume ls [OPTIONS]",
    description: "List volumes",
    maxArgs: 0,
    options: [{ names: ["-q", "--quiet"], description: "Only display volume names" }],
  },
  run: ({ state, parsed }) => {
    if (has(parsed, "--quiet")) return ok(state.volumes.map((volume) => volume.name).join("\n"));
    return ok(
      table(
        ["DRIVER", "VOLUME NAME"],
        state.volumes.map((volume) => ["local", volume.name]),
      ),
    );
  },
};

const volumeInspect: CommandDef = {
  path: "volume inspect",
  spec: {
    usage: "docker volume inspect [OPTIONS] VOLUME [VOLUME...]",
    description: "Display detailed information on one or more volumes",
    minArgs: 1,
  },
  run: ({ state, parsed }) => {
    const found = [];
    for (const name of parsed.args) {
      const volume = state.volumes.find((candidate) => candidate.name === name);
      if (!volume) return fail(`[]\nError response from daemon: get ${name}: no such volume`);
      found.push({
        CreatedAt: new Date(volume.createdAt).toISOString().replace(/\.\d+Z$/, "Z"),
        Driver: "local",
        Labels: volume.compose ? { "com.docker.compose.project": volume.compose } : null,
        Mountpoint: `/var/lib/docker/volumes/${volume.name}/_data`,
        Name: volume.name,
        Options: null,
        Scope: "local",
      });
    }
    return ok(json(found));
  },
};

const volumeRm: CommandDef = {
  path: "volume rm",
  aliases: ["volume remove"],
  spec: {
    usage: "docker volume rm [OPTIONS] VOLUME [VOLUME...]",
    description: "Remove one or more volumes. You cannot remove a volume that is in use by a container.",
    minArgs: 1,
    options: [{ names: ["-f", "--force"], description: "Force the removal of one or more volumes" }],
  },
  run: ({ state, parsed }) => {
    const lines: string[] = [];
    let code = 0;
    for (const name of parsed.args) {
      if (!state.volumes.some((volume) => volume.name === name)) {
        lines.push(`Error response from daemon: get ${name}: no such volume`);
        code = 1;
        continue;
      }
      const users = volumeUsers(state, name);
      if (users.length) {
        lines.push(`Error response from daemon: remove ${name}: volume is in use - [${users.map((container) => container.id).join(", ")}]`);
        code = 1;
        continue;
      }
      state.volumes = state.volumes.filter((volume) => volume.name !== name);
      lines.push(name);
    }
    return { out: lines.join("\n"), code };
  },
};

/** Supprime les volumes inutilisés (`all` = y compris les volumes nommés). */
export function pruneVolumes(state: SimState, all: boolean): { names: string[]; space: number } {
  const removed = state.volumes.filter(
    (volume) => volumeUsers(state, volume.name).length === 0 && (all || /^[0-9a-f]{64}$/.test(volume.name)),
  );
  state.volumes = state.volumes.filter((volume) => !removed.includes(volume));
  return { names: removed.map((volume) => volume.name), space: removed.length * 60 * MB };
}

const volumePrune: CommandDef = {
  path: "volume prune",
  spec: {
    usage: "docker volume prune [OPTIONS]",
    description: "Remove unused local volumes",
    maxArgs: 0,
    options: [
      { names: ["-a", "--all"], description: "Remove all unused volumes, not just anonymous ones" },
      { names: ["-f", "--force"], description: "Do not prompt for confirmation" },
    ],
  },
  run: ({ state, parsed }) => {
    const all = has(parsed, "--all");
    const action = (current: SimState): Outcome => {
      const { names, space } = pruneVolumes(current, all);
      return ok(join(names.length ? `Deleted Volumes:\n${names.join("\n")}\n` : undefined, `Total reclaimed space: ${humanSize(space)}`));
    };
    if (has(parsed, "--force")) return action(state);
    const warning = all
      ? "WARNING! This will remove all local volumes not used by at least one container."
      : "WARNING! This will remove anonymous local volumes not used by at least one container.";
    return { out: warning, prompt: confirm(action) };
  },
};

// ─── Réseaux ───────────────────────────────────────────────────────────────

const findNetwork = (state: SimState, name: string) =>
  state.networks.find((network) => network.name === name || network.id.startsWith(name));

const networkCreate: CommandDef = {
  path: "network create",
  spec: {
    usage: "docker network create [OPTIONS] NETWORK",
    description: "Create a network",
    minArgs: 1,
    maxArgs: 1,
    options: [{ names: ["-d", "--driver"], value: "string", description: 'Driver to manage the Network (default "bridge")' }],
  },
  run: ({ state, parsed }) => {
    const name = parsed.args[0];
    if (state.networks.some((network) => network.name === name)) return daemonError(`network with name ${name} already exists`);
    const network = { id: randomHex(64), name, driver: value(parsed, "--driver") ?? "bridge", createdAt: Date.now() };
    state.networks.push(network);
    return ok(network.id);
  },
};

const networkLs: CommandDef = {
  path: "network ls",
  aliases: ["network list"],
  spec: {
    usage: "docker network ls [OPTIONS]",
    description: "List networks",
    maxArgs: 0,
    options: [{ names: ["-q", "--quiet"], description: "Only display network IDs" }],
  },
  run: ({ state, parsed }) => {
    const list = [...state.networks].sort((a, b) => a.name.localeCompare(b.name));
    if (has(parsed, "--quiet")) return ok(list.map((network) => shortId(network.id)).join("\n"));
    return ok(
      table(
        ["NETWORK ID", "NAME", "DRIVER", "SCOPE"],
        list.map((network) => [shortId(network.id), network.name, network.driver, "local"]),
      ),
    );
  },
};

const networkInspect: CommandDef = {
  path: "network inspect",
  spec: {
    usage: "docker network inspect [OPTIONS] NETWORK [NETWORK...]",
    description: "Display detailed information on one or more networks",
    minArgs: 1,
  },
  run: ({ state, parsed }) => {
    const found = [];
    for (const name of parsed.args) {
      const network = findNetwork(state, name);
      if (!network) return fail(`[]\nError response from daemon: network ${name} not found`);
      const members = state.containers.filter((container) => container.status === "running" && container.networks.includes(network.name));
      found.push({
        Name: network.name,
        Id: network.id,
        Created: new Date(network.createdAt).toISOString(),
        Scope: "local",
        Driver: network.driver,
        Containers: Object.fromEntries(
          members.map((container, index) => [container.id, { Name: container.name, IPv4Address: `172.18.0.${index + 2}/16` }]),
        ),
      });
    }
    return ok(json(found));
  },
};

const networkConnect: CommandDef = {
  path: "network connect",
  spec: {
    usage: "docker network connect [OPTIONS] NETWORK CONTAINER",
    description: "Connect a container to a network",
    minArgs: 2,
    maxArgs: 2,
  },
  run: ({ state, parsed }) => {
    const [networkName, containerName] = parsed.args;
    const network = findNetwork(state, networkName);
    if (!network) return daemonError(`network ${networkName} not found`);
    const container = findContainer(state, containerName);
    if (!container) return daemonError(`No such container: ${containerName}`);
    if (container.networks.includes(network.name))
      return daemonError(`endpoint with name ${container.name} already exists in network ${network.name}`);
    container.networks.push(network.name);
    return ok();
  },
};

const networkDisconnect: CommandDef = {
  path: "network disconnect",
  spec: {
    usage: "docker network disconnect [OPTIONS] NETWORK CONTAINER",
    description: "Disconnect a container from a network",
    minArgs: 2,
    maxArgs: 2,
  },
  run: ({ state, parsed }) => {
    const [networkName, containerName] = parsed.args;
    const network = findNetwork(state, networkName);
    if (!network) return daemonError(`network ${networkName} not found`);
    const container = findContainer(state, containerName);
    if (!container) return daemonError(`No such container: ${containerName}`);
    if (!container.networks.includes(network.name))
      return daemonError(`container ${container.id} is not connected to network ${network.name}`);
    container.networks = container.networks.filter((name) => name !== network.name);
    return ok();
  },
};

const networkRm: CommandDef = {
  path: "network rm",
  aliases: ["network remove"],
  spec: { usage: "docker network rm NETWORK [NETWORK...]", description: "Remove one or more networks", minArgs: 1 },
  run: ({ state, parsed }) => {
    const lines: string[] = [];
    let code = 0;
    for (const name of parsed.args) {
      const network = findNetwork(state, name);
      if (!network) {
        lines.push(`Error response from daemon: network ${name} not found`);
        code = 1;
      } else if (network.builtin) {
        lines.push(`Error response from daemon: ${network.name} is a pre-defined network and cannot be removed`);
        code = 1;
      } else if (state.containers.some((container) => container.status === "running" && container.networks.includes(network.name))) {
        lines.push(
          `Error response from daemon: error while removing network: network ${network.name} id ${network.id} has active endpoints`,
        );
        code = 1;
      } else {
        state.networks = state.networks.filter((other) => other !== network);
        lines.push(name);
      }
    }
    return { out: lines.join("\n"), code };
  },
};

const networkPrune: CommandDef = {
  path: "network prune",
  spec: {
    usage: "docker network prune [OPTIONS]",
    description: "Remove all unused networks",
    maxArgs: 0,
    options: [{ names: ["-f", "--force"], description: "Do not prompt for confirmation" }],
  },
  run: ({ state, parsed }) => {
    const action = (current: SimState): Outcome => {
      const removed = current.networks.filter(
        (network) => !network.builtin && !current.containers.some((container) => container.networks.includes(network.name)),
      );
      current.networks = current.networks.filter((network) => !removed.includes(network));
      return ok(removed.length ? `Deleted Networks:\n${removed.map((network) => network.name).join("\n")}` : "");
    };
    if (has(parsed, "--force")) return action(state);
    return { out: "WARNING! This will remove all custom networks not used by at least one container.", prompt: confirm(action) };
  },
};

export const storageCommands: CommandDef[] = [
  volumeCreate,
  volumeLs,
  volumeInspect,
  volumeRm,
  volumePrune,
  networkCreate,
  networkLs,
  networkInspect,
  networkConnect,
  networkDisconnect,
  networkRm,
  networkPrune,
];

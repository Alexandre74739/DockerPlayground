import { tokenize } from "../command-parser";
import { ask, fail, join, ok, type Outcome } from "./command";
import { humanSize, randomHex } from "./format";
import { activate, current, findMachine, fingerprint, homeOf, knowsHost, publicKey, rememberHost } from "./machines";
import { resolvePath } from "./state";
import type { SimState } from "./types";

/**
 * Commandes réseau et d'administration d'un serveur : ssh, scp, ssh-keygen,
 * ssh-copy-id, installation de Docker, groupe docker, pare-feu ufw.
 */

export type LineRunner = (state: SimState, argv: string[], options: { root: boolean }) => Outcome;

type Target = { user: string; host: string; id: string };

function parseTarget(state: SimState, spec: string): Target | Outcome {
  const [user, host] = spec.includes("@") ? spec.split("@") : [state.user, spec];
  const id = findMachine(state, host);
  if (!id || id === "local") return fail(`ssh: Could not resolve hostname ${host}: Name or service not known`, 255);
  return { user, host, id };
}

/** Empreinte inconnue → question, puis authentification par clé ou mot de passe. */
function authenticate(state: SimState, target: Target, onSuccess: (state: SimState) => Outcome, intro?: string): Outcome {
  const machine = state.machines[target.id];
  const withPassword = (next: SimState): Outcome => {
    const key = publicKey(next);
    if (key && machine.authorizedKeys.includes(key) && target.user === machine.data.user) return onSuccess(next);
    if (!machine.passwordAuth) return fail(`${target.user}@${target.host}: Permission denied (publickey).`, 255);
    return {
      prompt: ask(
        `${target.user}@${target.host}'s password: `,
        (after, answer) => {
          if (answer === machine.password && target.user === machine.data.user) return onSuccess(after);
          return fail(`Permission denied, please try again.\n${target.user}@${target.host}: Permission denied (publickey,password).`, 255);
        },
        true,
      ),
    };
  };
  if (knowsHost(state, target.host)) {
    const outcome = withPassword(state);
    return intro ? { ...outcome, out: join(intro, outcome.out) } : outcome;
  }
  return {
    out: join(
      intro,
      `The authenticity of host '${target.host} (${machine.ip})' can't be established.`,
      `ED25519 key fingerprint is ${fingerprint(target.host)}.`,
      "This key is not known by any other names.",
    ),
    prompt: ask("Are you sure you want to continue connecting (yes/no/[fingerprint])? ", (next, answer) => {
      if (!/^y(es)?$/i.test(answer.trim())) return fail("Host key verification failed.", 255);
      rememberHost(next, target.host);
      const outcome = withPassword(next);
      return { ...outcome, out: join(`Warning: Permanently added '${target.host}' (ED25519) to the list of known hosts.`, outcome.out) };
    }),
  };
}

function banner(state: SimState): string {
  const machine = current(state);
  return `Welcome to ${machine.os} (GNU/Linux 6.8.0-48-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com

  System load:  0.08               Processes:             112
  Usage of /:   18.4% of 38.58GB   Users logged in:       0
  Memory usage: 21%                IPv4 address for eth0: ${machine.ip}

Last login: ${new Date(Date.now() - 86_400_000).toUTCString().replace(" GMT", "")} from 192.168.1.20`;
}

/** Connexion : la machine distante devient la machine active. */
function login(state: SimState, target: Target): void {
  const from = state.machine;
  activate(state, target.id);
  state.sshStack.push(from);
  state.cwd = homeOf(state.user);
  const machine = current(state);
  // L'ajout au groupe docker ne prend effet qu'à la connexion suivante.
  if (machine.pendingGroup.includes(state.user)) {
    machine.pendingGroup = machine.pendingGroup.filter((user) => user !== state.user);
    machine.dockerGroup.push(state.user);
  }
}

export function ssh(state: SimState, args: string[], runLine: LineRunner): Outcome {
  const positional = args.filter((arg, index) => !arg.startsWith("-") && !["-i", "-p", "-l"].includes(args[index - 1] ?? ""));
  const [spec, ...command] = positional;
  if (!spec) return fail("usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] [-i identity_file] [-p port] destination [command [argument ...]]", 255);
  const target = parseTarget(state, spec);
  if (!("id" in target)) return target;
  return authenticate(state, target, (next) => {
    login(next, target);
    if (command.length === 0) return ok(banner(next));
    // ssh serveur commande : exécution distante puis retour immédiat.
    const outcome = runLine(next, command.length === 1 ? tokenize(command[0]) : command, { root: false });
    logout(next);
    return outcome;
  });
}

function logout(state: SimState): string {
  const left = current(state);
  activate(state, state.sshStack.pop()!);
  return left.ip;
}

/** exit / logout dans une session ssh. */
export function disconnect(state: SimState): Outcome {
  const ip = logout(state);
  return ok(`logout\nConnection to ${ip} closed.`);
}

export function scp(state: SimState, args: string[]): Outcome {
  const recursive = args.includes("-r");
  const operands = args.filter((arg) => !arg.startsWith("-"));
  if (operands.length < 2)
    return fail("usage: scp [-346ABCOpqRrsTv] [-c cipher] [-D sftp_server_path] [-F ssh_config]\n           source ... target", 1);
  const destination = operands.pop()!;
  const remoteSpec = (value: string) => value.match(/^([^:@]+@)?([^:]+):(.*)$/);
  const upload = remoteSpec(destination);
  const download = operands.length === 1 ? remoteSpec(operands[0]) : null;
  const spec = upload ?? download;
  if (!spec) return fail("scp: aucune destination distante (format utilisateur@hôte:chemin)", 1);
  const target = parseTarget(state, `${spec[1] ?? `${state.user}@`}${spec[2]}`.replace(/@@/, "@"));
  if (!("id" in target)) return target;

  return authenticate(state, target, (next) => {
    const remote = next.machines[target.id].data;
    const remoteHome = homeOf(remote.user);
    const lines: string[] = [];
    const trailingSlash = (upload ? upload[3] : destination).endsWith("/");
    const copy = (
      fromFiles: Record<string, string>,
      fromPath: string,
      toFiles: Record<string, string>,
      toPath: string,
      toDirs: string[],
    ) => {
      const isDirectory = Object.keys(fromFiles).some((path) => path.startsWith(`${fromPath}/`));
      if (fromFiles[fromPath] === undefined && !isDirectory) return `scp: ${fromPath}: No such file or directory`;
      if (isDirectory && fromFiles[fromPath] === undefined && !recursive) return `scp: ${fromPath}: not a regular file`;
      const destinationIsDir =
        trailingSlash || toDirs.includes(toPath) || Object.keys(toFiles).some((path) => path.startsWith(`${toPath}/`));
      const base = destinationIsDir ? `${toPath}/${fromPath.split("/").pop()}` : toPath;
      const entries =
        fromFiles[fromPath] !== undefined
          ? [[fromPath, fromFiles[fromPath]] as const]
          : Object.entries(fromFiles).filter(([path]) => path.startsWith(`${fromPath}/`));
      for (const [path, content] of entries) {
        const targetPath = path === fromPath ? base : `${base}${path.slice(fromPath.length)}`;
        toFiles[targetPath] = content;
        const directory = targetPath.slice(0, targetPath.lastIndexOf("/"));
        if (!toDirs.includes(directory)) toDirs.push(directory);
        lines.push(
          `${path.split("/").pop()!.padEnd(38)} 100% ${humanSize(content.length).padStart(6)}  ${(content.length / 10.4 / 1000).toFixed(1)}KB/s   00:00`,
        );
      }
      return undefined;
    };
    if (upload) {
      const toPath = resolvePath(remoteHome, upload[3] || ".", remoteHome);
      for (const operand of operands) {
        const error = copy(next.files, resolvePath(next.cwd, operand, homeOf(next.user)), remote.files, toPath, remote.dirs);
        if (error) return fail(join(...lines, error), 1);
      }
    } else {
      const error = copy(
        remote.files,
        resolvePath(remoteHome, download![3], remoteHome),
        next.files,
        resolvePath(next.cwd, destination, homeOf(next.user)),
        next.dirs,
      );
      if (error) return fail(join(...lines, error), 1);
    }
    return ok(lines.join("\n"));
  });
}

export function sshKeygen(state: SimState, args: string[]): Outcome {
  const option = (flag: string) => {
    const index = args.indexOf(flag);
    return index === -1 ? undefined : args[index + 1];
  };
  const type = option("-t") ?? "ed25519";
  if (!["ed25519", "rsa", "ecdsa"].includes(type)) return fail(`unknown key type ${type}`, 1);
  const comment = option("-C") ?? `${state.user}@${state.hostname}`;
  const defaultPath = `${homeOf(state.user)}/.ssh/id_${type}`;

  const generate = (next: SimState, path: string): Outcome => {
    const body = randomHex(43).replace(/[0-9]/g, (digit) => "AbCdEfGhIj"[Number(digit)]);
    next.files[path] = `-----BEGIN OPENSSH PRIVATE KEY-----\n(clé privée simulée)\n-----END OPENSSH PRIVATE KEY-----\n`;
    next.files[`${path}.pub`] = `ssh-${type} AAAAC3NzaC1lZDI1NTE5AAAAI${body} ${comment}\n`;
    const directory = path.slice(0, path.lastIndexOf("/"));
    if (!next.dirs.includes(directory)) next.dirs.push(directory);
    return ok(`Your identification has been saved in ${path}
Your public key has been saved in ${path}.pub
The key fingerprint is:
${fingerprint(body)} ${comment}
The key's randomart image is:
+--[ED25519 256]--+
|      .o+*=o.    |
|     . +.=*.     |
|      o =.+o .   |
|     . * =. + .  |
|      = S .+ o   |
|     o = .  = .  |
|    . = .  o =   |
|     o.+ ...+ E  |
|     .+o.  .oo   |
+----[SHA256]-----+`);
  };
  const askPassphrase = (path: string) =>
    ask(
      "Enter passphrase (empty for no passphrase): ",
      (_next, first) => ({
        prompt: ask(
          "Enter same passphrase again: ",
          (after, second) => (first === second ? generate(after, path) : fail("Passphrases do not match.  Try again.", 1)),
          true,
        ),
      }),
      true,
    );
  const withPath = (path: string): Outcome => {
    if (state.files[path] === undefined) return { prompt: askPassphrase(path) };
    return {
      out: `${path} already exists.`,
      prompt: ask("Overwrite (y/n)? ", (_next, answer) => (/^y/i.test(answer) ? { prompt: askPassphrase(path) } : fail("", 1))),
    };
  };
  const file = option("-f");
  if (file) return { out: `Generating public/private ${type} key pair.`, ...withPath(resolvePath(state.cwd, file, homeOf(state.user))) };
  return {
    out: `Generating public/private ${type} key pair.`,
    prompt: ask(`Enter file in which to save the key (${defaultPath}): `, (_next, answer) =>
      withPath(answer.trim() ? resolvePath(state.cwd, answer.trim(), homeOf(state.user)) : defaultPath),
    ),
  };
}

export function sshCopyId(state: SimState, args: string[]): Outcome {
  const index = args.indexOf("-i");
  const keyPath =
    index === -1
      ? `${homeOf(state.user)}/.ssh/id_ed25519.pub`
      : resolvePath(state.cwd, args[index + 1].replace(/(\.pub)?$/, ".pub"), homeOf(state.user));
  const spec = args.filter((arg, position) => !arg.startsWith("-") && args[position - 1] !== "-i")[0];
  if (!spec)
    return fail(
      "Usage: /usr/bin/ssh-copy-id [-h|-?|-f|-n|-s|-x] [-i [identity_file]] [-p port] [-F alternative ssh_config file] [-t target_path] [[-o <ssh -o options>] ...] [user@]hostname",
      1,
    );
  const key = state.files[keyPath]?.trim();
  if (!key) return fail("/usr/bin/ssh-copy-id: ERROR: No identities found", 1);
  const target = parseTarget(state, spec);
  if (!("id" in target)) return target;
  const machine = state.machines[target.id];
  const intro = `/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "${keyPath}"\n/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed`;
  if (knowsHost(state, target.host) && machine.authorizedKeys.includes(key)) {
    return ok(`${intro}\n\n/usr/bin/ssh-copy-id: WARNING: All keys were skipped because they already exist on the remote system.`);
  }
  return authenticate(
    state,
    target,
    (next) => {
      next.machines[target.id].authorizedKeys.push(key);
      return ok(`
Number of key(s) added: 1

Now try logging into the machine, with:   "ssh '${target.user}@${target.host}'"
and check to make sure that only the key(s) you wanted were added.`);
    },
    `${intro}\n/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys`,
  );
}

// ─── Administration du serveur ─────────────────────────────────────────────

const GET_DOCKER =
  "#!/bin/sh\n# Docker Engine for Linux installation script.\n# https://get.docker.com\nset -e\n# … (script officiel, abrégé)\n";

export function installDocker(state: SimState, root: boolean, method: "script" | "apt"): Outcome {
  if (!root) {
    return method === "script"
      ? fail(
          '# Executing docker install script, commit: 711a8b4\nERROR: this installer needs the ability to run commands as root.\nWe are unable to find either "sudo" or "su" available to make this happen.',
          1,
        )
      : fail(
          "E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?",
          100,
        );
  }
  current(state).dockerInstalled = true;
  if (method === "apt")
    return ok(
      "Reading package lists... Done\nBuilding dependency tree... Done\nThe following NEW packages will be installed:\n  bridge-utils containerd docker.io pigz runc ubuntu-fan\nSetting up docker.io (26.1.3-0ubuntu1~24.04.1) ...\nCreated symlink /etc/systemd/system/multi-user.target.wants/docker.service → /usr/lib/systemd/system/docker.service.",
    );
  return ok(`# Executing docker install script, commit: 711a8b4
+ sh -c apt-get -qq update >/dev/null
+ sh -c DEBIAN_FRONTEND=noninteractive apt-get -y -qq install ca-certificates curl >/dev/null
+ sh -c install -m 0755 -d /etc/apt/keyrings
+ sh -c curl -fsSL "https://download.docker.com/linux/ubuntu/gpg" -o /etc/apt/keyrings/docker.asc
+ sh -c chmod a+r /etc/apt/keyrings/docker.asc
+ sh -c echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" > /etc/apt/sources.list.d/docker.list
+ sh -c apt-get -qq update >/dev/null
+ sh -c DEBIAN_FRONTEND=noninteractive apt-get -y -qq install docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-ce-rootless-extras docker-buildx-plugin >/dev/null
+ sh -c docker version
Client: Docker Engine - Community
 Version:           27.3.1
 API version:       1.47

Server: Docker Engine - Community
 Engine:
  Version:          27.3.1
  API version:      1.47 (minimum version 1.24)

================================================================================

To run Docker as a non-privileged user, consider setting up the
Docker daemon in rootless mode for your user:

    dockerd-rootless-setuptool.sh install

Visit https://docs.docker.com/go/rootless/ to learn about rootless mode.


To run the Docker daemon as a fully privileged service, but granting non-root
users access, refer to https://docs.docker.com/go/daemon-access/

WARNING: Access to the remote API on a privileged Docker daemon is equivalent
         to root access on the host. Refer to the 'Docker daemon attack surface'
         documentation for details: https://docs.docker.com/go/attack-surface/

================================================================================`);
}

/** Téléchargement du script officiel : curl -fsSL https://get.docker.com -o get-docker.sh */
export function downloadInstaller(state: SimState, args: string[]): Outcome | undefined {
  if (!args.some((arg) => /get\.docker\.com/.test(arg))) return undefined;
  const index = args.indexOf("-o");
  if (index === -1) return ok(GET_DOCKER.trimEnd());
  state.files[resolvePath(state.cwd, args[index + 1], homeOf(state.user))] = GET_DOCKER;
  return ok();
}

export function isInstallerScript(state: SimState, path: string): boolean {
  return state.files[resolvePath(state.cwd, path, homeOf(state.user))] === GET_DOCKER;
}

export function usermod(state: SimState, args: string[], root: boolean): Outcome {
  if (!root) return fail("usermod: Permission denied.\nusermod: cannot lock /etc/passwd; try again later.", 1);
  const flags = args.filter((arg) => arg.startsWith("-")).join("");
  const group = args.find((arg, index) => index > 0 && args[index - 1].startsWith("-") && args[index - 1].includes("G"));
  const user = args.at(-1)!;
  if (!flags.includes("a") || !flags.includes("G") || group !== "docker")
    return fail("usermod : seul « usermod -aG docker UTILISATEUR » est simulé ici.", 2);
  const machine = current(state);
  if (!machine.dockerInstalled) return fail("usermod: group 'docker' does not exist", 6);
  if (user !== machine.data.user && user !== state.user) return fail(`usermod: user '${user}' does not exist`, 6);
  if (!machine.dockerGroup.includes(user) && !machine.pendingGroup.includes(user)) machine.pendingGroup.push(user);
  return ok();
}

/** newgrp docker : applique le groupe dans le shell courant, sans se reconnecter. */
export function newgrp(state: SimState, args: string[]): Outcome {
  const machine = current(state);
  if (args[0] !== "docker") return fail(`newgrp: group '${args[0] ?? ""}' does not exist`, 1);
  if (machine.pendingGroup.includes(state.user)) {
    machine.pendingGroup = machine.pendingGroup.filter((user) => user !== state.user);
    machine.dockerGroup.push(state.user);
  }
  return machine.dockerGroup.includes(state.user)
    ? ok()
    : fail("Password: \nnewgrp: failed to crypt password with previous salt: Invalid argument", 1);
}

/** Pare-feu ufw (pour le cours : les ports publiés par Docker le contournent). */
export function ufw(state: SimState, args: string[], root: boolean): Outcome {
  if (!root) return fail("ERROR: You need to be root to run this script", 1);
  const machine = current(state);
  machine.ufw ??= { enabled: false, rules: [] };
  const [command, rule] = args;
  if (command === "allow" && rule) {
    if (!machine.ufw.rules.includes(rule)) machine.ufw.rules.push(rule);
    return ok("Rules updated\nRules updated (v6)");
  }
  if (command === "enable") {
    machine.ufw.enabled = true;
    return ok(
      "Command may disrupt existing ssh connections. Proceed with operation (y|n)? y\nFirewall is active and enabled on system startup",
    );
  }
  if (command === "status") {
    if (!machine.ufw.enabled) return ok("Status: inactive");
    const rows = machine.ufw.rules.map((ruleName) => `${ruleName.padEnd(27)}ALLOW       Anywhere`);
    return ok(
      ["Status: active", "", "To                         Action      From", "--                         ------      ----", ...rows].join(
        "\n",
      ),
    );
  }
  return fail("ufw : commandes simulées — status, enable, allow PORT", 1);
}

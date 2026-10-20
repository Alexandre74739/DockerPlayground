import { catalog, osRelease, shellsFor } from "./catalog";
import { shortId } from "./format";
import { current, findMachine, homeOf, machineData } from "./machines";
import { displayPath, isDirectory, listDirectory, resolvePath } from "./state";
import { setExited } from "./runtime";
import type { Container, FileSystem, ShellName, SimState } from "./types";

/**
 * Shells simulés : le terminal de l'hôte (bash) et les shells ouverts dans
 * les conteneurs (docker run -it / docker exec -it).
 */

export type ShellOutput = { out: string; code: number };

const ROOT_DIRS = [
  "/bin",
  "/dev",
  "/etc",
  "/home",
  "/lib",
  "/media",
  "/mnt",
  "/opt",
  "/proc",
  "/root",
  "/run",
  "/sbin",
  "/srv",
  "/sys",
  "/tmp",
  "/usr",
  "/var",
];

function lsLong(names: string[], isDir: (name: string) => boolean, size: (name: string) => number, owner: string): string {
  const date = new Date()
    .toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    .replace(",", "");
  return [
    `total ${names.length * 4}`,
    ...names.map((name) => {
      const dir = isDir(name);
      return `${dir ? "drwxr-xr-x" : "-rw-r--r--"} 1 ${owner} ${owner} ${String(dir ? 4096 : size(name)).padStart(5)} ${date} ${name}`;
    }),
  ].join("\n");
}

function ls(
  args: string[],
  cwd: string,
  fs: FileSystem,
  dirs: string[],
  owner: string,
  notFound: (path: string) => string,
  home?: string,
): ShellOutput {
  const flags = args.filter((arg) => arg.startsWith("-")).join("");
  const target = args.find((arg) => !arg.startsWith("-")) ?? ".";
  const path = resolvePath(cwd, target, home);
  if (fs[path] !== undefined) return { out: target, code: 0 };
  if (!isDirectory(fs, dirs, path)) return { out: notFound(target), code: 2 };
  const all = flags.includes("a");
  const names = listDirectory(fs, dirs, path).filter((name) => all || !name.startsWith("."));
  const entries = all ? [".", "..", ...names] : names;
  if (flags.includes("l")) {
    return {
      out: lsLong(
        entries,
        (name) => name === "." || name === ".." || isDirectory(fs, dirs, `${path === "/" ? "" : path}/${name}`),
        (name) => (fs[`${path}/${name}`] ?? "").length,
        owner,
      ),
      code: 0,
    };
  }
  return { out: entries.join("  "), code: 0 };
}

function cat(args: string[], cwd: string, fs: FileSystem, dirs: string[], prefix: string, home?: string): ShellOutput {
  if (args.length === 0) return { out: "", code: 0 };
  const outputs: string[] = [];
  let code = 0;
  for (const arg of args) {
    const path = resolvePath(cwd, arg, home);
    if (fs[path] !== undefined) outputs.push(fs[path]);
    else {
      outputs.push(`${prefix}${arg}: ${isDirectory(fs, dirs, path) ? "Is a directory" : "No such file or directory"}`);
      code = 1;
    }
  }
  return { out: outputs.join("\n"), code };
}

// ─── Shell de l'hôte ───────────────────────────────────────────────────────

export function hostPrompt(state: SimState): string {
  return `${state.user}@${state.hostname}:${displayPath(state.cwd, homeOf(state.user))}${state.user === "root" ? "#" : "$"}`;
}

const HOST_HELP = `GNU bash, version 5.2.21(1)-release (x86_64-pc-linux-gnu)
Commandes disponibles dans ce terminal d'entraînement :
  docker …        la CLI Docker (docker --help)
  ls, cd, pwd     naviguer dans les fichiers
  cat FICHIER     afficher un fichier
  curl URL        tester un port publié (ex: curl localhost:8080)
  nc -zv HÔTE P   tester l'ouverture d'un port
  ssh, scp        se connecter à un serveur, copier des fichiers
  ssh-keygen      créer une paire de clés ssh
  sudo CMD        exécuter en administrateur (sur un serveur)
  clear           effacer l'écran (ou Ctrl+L)`;

type Endpoint = { data: ReturnType<typeof machineData>; local: boolean; host: string };

/** Machine visée par une adresse : la machine courante (localhost) ou une autre, par IP ou nom. */
function endpoint(state: SimState, host: string): Endpoint | undefined {
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(host)) return { data: machineData(state, state.machine), local: true, host };
  const id = findMachine(state, host);
  return id ? { data: machineData(state, id), local: false, host } : undefined;
}

/** Conteneur qui publie ce port, joignable depuis l'appelant (un port lié à 127.0.0.1 ne l'est que localement). */
function publishedOn(target: Endpoint, port: string): Container | undefined {
  return target.data.containers.find(
    (candidate) =>
      candidate.status === "running" &&
      candidate.ports.some((bind) => bind.host === port && (target.local || !bind.ip || bind.ip === "0.0.0.0")),
  );
}

function curl(state: SimState, args: string[]): ShellOutput {
  const url = args.find((arg) => !arg.startsWith("-") && !/^\d+$/.test(arg));
  if (!url) return { out: "curl: try 'curl --help' or 'curl --manual' for more information", code: 2 };
  const match = url.match(/^(?:https?:\/\/)?([\w.-]+)(?::(\d+))?(\/.*)?$/);
  const target = match ? endpoint(state, match[1]) : undefined;
  if (!match || !target) return { out: `curl: (6) Could not resolve host: ${url.replace(/^https?:\/\//, "").split(/[/:]/)[0]}`, code: 6 };
  const port = match[2] ?? (url.startsWith("https") ? "443" : "80");
  const container = publishedOn(target, port);
  if (!container) {
    return {
      out: `curl: (7) Failed to connect to ${match[1]} port ${port} after ${target.local ? 0 : 31} ms: Couldn't connect to server`,
      code: 7,
    };
  }
  const bind = container.ports.find((candidate) => candidate.host === port)!;
  const docRoot = container.kind === "nginx" ? "/usr/share/nginx/html" : container.kind === "httpd" ? "/usr/local/apache2/htdocs" : null;
  const listening = docRoot ? "80" : container.kind === "app" ? String(state.app.port) : undefined;
  if (listening && bind.container.split("/")[0] !== listening)
    return { out: "curl: (56) Recv failure: Connection reset by peer", code: 56 };
  if (docRoot) {
    const mount = container.mounts.find((candidate) => candidate.type === "bind" && candidate.target === docRoot);
    const page = mount ? target.data.files[`${mount.source}/index.html`] : container.fs[`${docRoot}/index.html`];
    return page
      ? { out: page, code: 0 }
      : {
          out: "<html>\r\n<head><title>403 Forbidden</title></head>\r\n<body>\r\n<center><h1>403 Forbidden</h1></center>\r\n<hr><center>nginx/1.27.2</center>\r\n</body>\r\n</html>",
          code: 0,
        };
  }
  if (container.kind === "app") return { out: state.app.response, code: 0 };
  return { out: "curl: (52) Empty reply from server", code: 52 };
}

/** nc -zv HÔTE PORT : test d'ouverture d'un port. */
function netcat(state: SimState, args: string[]): ShellOutput {
  const [host, port] = args.filter((arg) => !arg.startsWith("-"));
  if (!host || !port) return { out: "usage: nc [-46CDdFhklNnrStUuvZz] [destination] [port]", code: 1 };
  const target = endpoint(state, host);
  if (!target) return { out: `nc: getaddrinfo for host "${host}" port ${port}: Name or service not known`, code: 1 };
  return publishedOn(target, port)
    ? { out: `Connection to ${host} ${port} port [tcp/*] succeeded!`, code: 0 }
    : { out: `nc: connect to ${host} port ${port} (tcp) failed: Connection refused`, code: 1 };
}

const OS_RELEASE = 'PRETTY_NAME="Ubuntu 24.04.1 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nVERSION="24.04.1 LTS (Noble Numbat)"\nID=ubuntu';

/** Redirections simples : commande > fichier, commande >> fichier. */
export function runHostCommand(state: SimState, argv: string[]): ShellOutput {
  const index = argv.findIndex((token) => token.startsWith(">"));
  if (index === -1) return runHostProgram(state, argv);
  const operator = argv[index].startsWith(">>") ? ">>" : ">";
  const target = argv[index].slice(operator.length) || argv[index + 1];
  if (!target) return { out: "bash: syntax error near unexpected token `newline'", code: 2 };
  const result = runHostProgram(state, argv.slice(0, index));
  if (result.code === 127) return result;
  const path = resolvePath(state.cwd, target, homeOf(state.user));
  const previous = state.files[path] ?? "";
  const text = result.out ? `${result.out}\n` : "";
  state.files[path] = operator === ">>" ? `${previous}${previous && !previous.endsWith("\n") ? "\n" : ""}${text}` : text;
  return { out: "", code: result.code };
}

function runHostProgram(state: SimState, argv: string[]): ShellOutput {
  const [program, ...args] = argv;
  const owner = state.user;
  switch (program) {
    case "ls":
    case "ll":
      return ls(
        program === "ll" ? ["-la", ...args] : args,
        state.cwd,
        state.files,
        state.dirs,
        owner,
        (path) => `ls: cannot access '${path}': No such file or directory`,
        homeOf(state.user),
      );
    case "pwd":
      return { out: state.cwd, code: 0 };
    case "cd": {
      const path = resolvePath(state.cwd, args[0] ?? homeOf(state.user), homeOf(state.user));
      if (state.files[path] !== undefined) return { out: `bash: cd: ${args[0]}: Not a directory`, code: 1 };
      if (!isDirectory(state.files, state.dirs, path) && path !== "/home") {
        return { out: `bash: cd: ${args[0]}: No such file or directory`, code: 1 };
      }
      state.cwd = path;
      return { out: "", code: 0 };
    }
    case "cat":
      if (args[0] === "/etc/os-release") return { out: OS_RELEASE, code: 0 };
      return cat(args, state.cwd, state.files, state.dirs, "cat: ", homeOf(state.user));
    case "echo":
      return { out: args.join(" "), code: 0 };
    case "whoami":
      return { out: state.user, code: 0 };
    case "hostname":
      return { out: args.includes("-I") ? current(state).ip : state.hostname, code: 0 };
    case "id": {
      const groups = [`1000(${state.user})`, "27(sudo)", ...(current(state).dockerGroup.includes(state.user) ? ["988(docker)"] : [])];
      return {
        out:
          state.user === "root"
            ? "uid=0(root) gid=0(root) groups=0(root)"
            : `uid=1000(${state.user}) gid=1000(${state.user}) groups=${groups.join(",")}`,
        code: 0,
      };
    }
    case "groups":
      return { out: [state.user, "sudo", ...(current(state).dockerGroup.includes(state.user) ? ["docker"] : [])].join(" "), code: 0 };
    case "uname":
      return { out: args.includes("-a") ? `Linux ${state.hostname} 6.8.0-48-generic #48-Ubuntu SMP x86_64 GNU/Linux` : "Linux", code: 0 };
    case "nc":
      return netcat(state, args);
    case "mkdir": {
      for (const arg of args.filter((value) => !value.startsWith("-"))) state.dirs.push(resolvePath(state.cwd, arg, homeOf(state.user)));
      return { out: "", code: 0 };
    }
    case "touch": {
      for (const arg of args) {
        const path = resolvePath(state.cwd, arg, homeOf(state.user));
        state.files[path] ??= "";
      }
      return { out: "", code: 0 };
    }
    case "cp":
    case "mv": {
      const [source, destination] = args.filter((value) => !value.startsWith("-"));
      if (!source || !destination) return { out: `${program}: missing file operand`, code: 1 };
      const from = resolvePath(state.cwd, source, homeOf(state.user));
      if (state.files[from] === undefined) return { out: `${program}: cannot stat '${source}': No such file or directory`, code: 1 };
      let to = resolvePath(state.cwd, destination, homeOf(state.user));
      if (isDirectory(state.files, state.dirs, to)) to = `${to}/${from.split("/").pop()}`;
      state.files[to] = state.files[from];
      if (program === "mv") delete state.files[from];
      return { out: "", code: 0 };
    }
    case "rm": {
      for (const arg of args.filter((value) => !value.startsWith("-"))) {
        const path = resolvePath(state.cwd, arg, homeOf(state.user));
        if (state.files[path] === undefined) return { out: `rm: cannot remove '${arg}': No such file or directory`, code: 1 };
        delete state.files[path];
      }
      return { out: "", code: 0 };
    }
    case "curl":
      return curl(state, args);
    case "help":
      return { out: HOST_HELP, code: 0 };
    case "exit":
    case "logout":
      return { out: "", code: 0 };
    default:
      return { out: `${program}: command not found`, code: 127 };
  }
}

// ─── Shells des conteneurs ─────────────────────────────────────────────────

export function containerWorkdir(state: SimState, container: Container): string {
  return state.images.find((image) => image.id === container.imageId)?.workdir ?? "/";
}

function containerDirs(state: SimState, container: Container): string[] {
  const workdir = containerWorkdir(state, container);
  return [...ROOT_DIRS, ...container.mounts.map((mount) => mount.target), workdir].filter((dir) => dir !== "/");
}

/** Contenu d'un conteneur, y compris les dossiers montés depuis l'hôte. */
function containerFiles(state: SimState, container: Container): FileSystem {
  const files: FileSystem = {
    "/etc/os-release": osRelease(container.kind, container.alpine),
    "/etc/hostname": shortId(container.id),
    ...container.fs,
  };
  for (const mount of container.mounts.filter((candidate) => candidate.type === "bind")) {
    for (const [path, content] of Object.entries(state.files)) {
      if (path.startsWith(`${mount.source}/`)) files[mount.target + path.slice(mount.source.length)] = content;
    }
  }
  return files;
}

const VERSIONS: Partial<Record<string, { kinds: Container["kind"][]; out: string }>> = {
  node: { kinds: ["node", "app"], out: "v22.11.0" },
  npm: { kinds: ["node", "app"], out: "10.9.0" },
  python3: { kinds: ["python"], out: "Python 3.13.0" },
  python: { kinds: ["python"], out: "Python 3.13.0" },
  nginx: { kinds: ["nginx"], out: "nginx version: nginx/1.27.2" },
  psql: { kinds: ["postgres"], out: "psql (PostgreSQL) 17.0 (Debian 17.0-1.pgdg120+1)" },
  "redis-server": { kinds: ["redis"], out: "Redis server v=7.4.1 sha=00000000:0 malloc=jemalloc-5.3.0 bits=64" },
};

function processList(container: Container): string {
  const main = container.command.join(" ");
  return container.alpine
    ? `PID   USER     TIME  COMMAND\n    1 root      0:00 ${main}\n   12 root      0:00 sh\n   18 root      0:00 ps`
    : `  PID TTY          TIME CMD\n    1 ?        00:00:00 ${container.command[0]}\n   12 pts/0    00:00:00 bash\n   20 pts/0    00:00:00 ps`;
}

/**
 * Exécute une commande dans un conteneur. `code` 127 = programme introuvable.
 * `cwd` est mis à jour pour `cd` (sessions interactives).
 */
export function runInContainer(
  state: SimState,
  container: Container,
  argv: string[],
  cwd = containerWorkdir(state, container),
): ShellOutput & { cwd: string } {
  const [program, ...args] = argv;
  const fs = containerFiles(state, container);
  const dirs = containerDirs(state, container);
  const result = (out: string, code = 0) => ({ out, code, cwd });

  switch (program) {
    case "ls":
      return {
        ...ls(
          args,
          cwd,
          fs,
          dirs,
          "root",
          (path) => `ls: ${container.alpine ? "" : "cannot access '"}${path}${container.alpine ? "" : "'"}: No such file or directory`,
        ),
        cwd,
      };
    case "pwd":
      return result(cwd);
    case "cd": {
      const path = resolvePath(cwd, args[0] ?? "/root");
      if (!isDirectory(fs, dirs, path)) return result(`${container.alpine ? "sh" : "bash"}: cd: ${args[0]}: No such file or directory`, 1);
      return { out: "", code: 0, cwd: path };
    }
    case "cat":
      return { ...cat(args, cwd, fs, dirs, "cat: "), cwd };
    case "echo":
      return result(args.join(" "));
    case "whoami":
      return result(container.user ?? "root");
    case "id":
      return result(
        container.user && container.user !== "root"
          ? `uid=1000(${container.user}) gid=1000(${container.user}) groups=1000(${container.user})`
          : "uid=0(root) gid=0(root) groups=0(root)",
      );
    case "hostname":
      return result(shortId(container.id));
    case "printenv":
      if (args[0]) {
        const entry = container.env.find((candidate) => candidate.startsWith(`${args[0]}=`));
        return entry ? result(entry.slice(args[0].length + 1)) : result("", 1);
      }
      return result(
        [
          `HOSTNAME=${shortId(container.id)}`,
          "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          ...container.env,
          "HOME=/root",
        ].join("\n"),
      );
    case "env":
      return result(
        [
          `HOSTNAME=${shortId(container.id)}`,
          "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          ...container.env,
          "HOME=/root",
        ].join("\n"),
      );
    case "uname":
      return result(args.includes("-a") ? `Linux ${shortId(container.id)} 6.10.14-linuxkit #1 SMP x86_64 GNU/Linux` : "Linux");
    case "ps":
      return result(processList(container));
    case "date":
      return result(new Date().toUTCString().replace("GMT", "UTC"));
    case "touch":
    case "mkdir":
      if (container.readOnly) return result(`${program}: cannot touch '${args.at(-1)}': Read-only file system`, 1);
      for (const arg of args.filter((value) => !value.startsWith("-"))) {
        const path = resolvePath(cwd, arg);
        if (program === "touch") container.fs[path] ??= "";
        else container.fs[`${path}/.keep`] = "";
      }
      return result("");
    case "redis-cli":
      if (container.kind === "redis") return result(args.includes("ping") ? "PONG" : "127.0.0.1:6379> (mode interactif non simulé)");
      break;
  }
  const version = VERSIONS[program];
  if (version && version.kinds.includes(container.kind)) return result(version.out);
  return result(container.alpine ? `sh: ${program}: not found` : `bash: ${program}: command not found`, 127);
}

export function sessionPrompt(state: SimState): string {
  const session = state.shell;
  if (!session) return hostPrompt(state);
  const container = state.containers.find((candidate) => candidate.id === session.containerId);
  if (session.shell === "node") return ">";
  if (session.shell === "python") return ">>>";
  const root = !container?.user || container.user === "root";
  const symbol = root ? "#" : "$";
  if (session.shell === "sh") return container?.alpine ? `${session.cwd} ${symbol}` : symbol;
  return `${container?.user ?? "root"}@${shortId(container?.id ?? "")}:${session.cwd === "/root" ? "~" : session.cwd}${symbol}`;
}

export function openSessionBanner(shell: ShellName): string {
  if (shell === "node") return 'Welcome to Node.js v22.11.0.\nType ".help" for more information.';
  if (shell === "python")
    return 'Python 3.13.0 (main, Oct 19 2024, 05:00:00) [GCC 12.2.0] on linux\nType "help", "copyright", "credits" or "license" for more information.';
  return "";
}

export function hasShell(container: Container, shell: ShellName): boolean {
  if (shell === "node") return container.kind === "node" || container.kind === "app";
  if (shell === "python") return container.kind === "python";
  return shellsFor(container.kind, container.alpine).includes(shell);
}

/** Traite une ligne saisie dans une session ouverte dans un conteneur. */
export function runSessionLine(state: SimState, line: string, argv: string[]): ShellOutput {
  const session = state.shell!;
  const container = state.containers.find((candidate) => candidate.id === session.containerId);
  const leave = () => {
    if (container && session.stopOnExit) setExited(state, container, 0);
    state.shell = null;
  };
  if (!container) {
    state.shell = null;
    return { out: "", code: 0 };
  }

  if (session.shell === "node") {
    if (line === ".exit") return (leave(), { out: "", code: 0 });
    if (line === ".help") return { out: ".exit     Exit the REPL\n.help     Print this help message", code: 0 };
    return { out: line ? "undefined" : "", code: 0 };
  }
  if (session.shell === "python") {
    if (line === "exit()" || line === "quit()" || line === "exit") return (leave(), { out: "", code: 0 });
    return line
      ? {
          out: `Traceback (most recent call last):\n  File "<stdin>", line 1, in <module>\nNameError: name '${argv[0]}' is not defined`,
          code: 0,
        }
      : { out: "", code: 0 };
  }
  if (argv.length === 0) return { out: "", code: 0 };
  if (argv[0] === "exit") {
    leave();
    return { out: session.shell === "bash" ? "exit" : "", code: 0 };
  }
  if (argv[0] === "docker") return { out: session.shell === "sh" ? "sh: docker: not found" : "bash: docker: command not found", code: 127 };
  if (argv[0] === "clear") return { out: "", code: 0 };
  const result = runInContainer(state, container, argv, session.cwd);
  session.cwd = result.cwd;
  return { out: result.code === 127 ? result.out.replace(/^bash/, session.shell === "sh" ? "sh" : "bash") : result.out, code: result.code };
}

export function entryLongRunning(kind: Container["kind"]): boolean {
  return kind === "app" || Boolean(catalog[kind]?.longRunning);
}

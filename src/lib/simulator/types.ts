/**
 * Modèle de l'environnement Docker simulé. L'état est un objet sérialisable :
 * chaque commande travaille sur une copie et renvoie le nouvel état.
 */

export type ImageKind =
  "hello-world" | "nginx" | "node" | "postgres" | "redis" | "ubuntu" | "alpine" | "python" | "httpd" | "mysql" | "mongo" | "app";

export type FileSystem = Record<string, string>;

export type Image = {
  id: string;
  /** Références complètes, ex: ["nginx:latest"]. Vide = image pendante (<none>). */
  tags: string[];
  size: number;
  createdAt: number;
  kind: ImageKind;
  /** L'image est basée sur Alpine (pas de bash). */
  alpine: boolean;
  /** Variante « slim » d'une image Debian. */
  slim?: boolean;
  /** Image de base déclarée par le premier FROM de l'étape finale (pour docker scout). */
  base?: string;
  cmd: string[];
  workdir: string;
  exposed: string[];
  env: string[];
  /** Utilisateur défini par l'instruction USER (root par défaut). */
  user?: string;
  healthcheck?: boolean;
  platforms?: string[];
  fs: FileSystem;
  history: { createdBy: string; size: number }[];
  /** Empreinte du build (Dockerfile + contexte) pour simuler le cache. */
  buildKey?: string;
};

export type PortBinding = {
  host: string;
  container: string;
  /** Adresse d'écoute sur l'hôte (0.0.0.0 par défaut, 127.0.0.1 = accessible seulement depuis la machine). */
  ip?: string;
};

export type Mount = { type: "volume" | "bind"; source: string; target: string; readOnly: boolean };

export type ContainerStatus = "created" | "running" | "restarting" | "exited";

export type Container = {
  id: string;
  name: string;
  /** Image telle que saisie par l'utilisateur (colonne IMAGE de docker ps). */
  image: string;
  imageId: string;
  command: string[];
  status: ContainerStatus;
  exitCode: number;
  createdAt: number;
  /** Démarrage ou arrêt le plus récent. */
  changedAt: number;
  ports: PortBinding[];
  env: string[];
  mounts: Mount[];
  networks: string[];
  /** Noms DNS supplémentaires sur les réseaux (nom du service Compose). */
  aliases: string[];
  autoRemove: boolean;
  /** Politique de redémarrage : no, always, unless-stopped, on-failure. */
  restart: string;
  healthcheck: boolean;
  user?: string;
  limits: { memory?: string; cpus?: string };
  readOnly: boolean;
  fs: FileSystem;
  kind: ImageKind;
  alpine: boolean;
  /** Sortie produite par la commande du conteneur (si différente des journaux par défaut). */
  output?: string;
  compose?: { project: string; service: string; configHash: string };
};

export type Volume = { name: string; createdAt: number; compose?: string };

export type Network = { id: string; name: string; driver: string; createdAt: number; builtin?: boolean };

/** Session shell ouverte dans un conteneur (docker run -it / docker exec -it). */
export type ShellName = "sh" | "bash" | "node" | "python";

export type ShellSession = {
  containerId: string;
  /** Machine dont le moteur héberge le conteneur (contexte distant). */
  machine?: string;
  shell: ShellName;
  cwd: string;
  /** Le conteneur s'arrête à la sortie (cas de docker run -it). */
  stopOnExit: boolean;
};

/** Dépôt publié sur le Docker Hub simulé. */
export type HubRepo = {
  private: boolean;
  tags: Record<string, { platforms: string[]; pushedAt: number; image?: Omit<Image, "id" | "tags"> }>;
};

/**
 * Comportement de l'application des images construites (kind "app") :
 * port d'écoute, réponse HTTP et dépendances obligatoires.
 */
export type AppBehavior = {
  port: number;
  response: string;
  /** Variables sans lesquelles l'application plante au démarrage. */
  requiredEnv: string[];
  /** Variables contenant une URL de service (base, cache) à joindre au démarrage. */
  urlEnv: string[];
};

/** Contexte Docker : quel moteur la CLI pilote. */
export type DockerContext = { description: string; endpoint: string };

/** Données propres à une machine, échangées quand on change de machine (ssh). */
export type MachineData = Pick<
  SimState,
  | "user"
  | "hostname"
  | "cwd"
  | "files"
  | "dirs"
  | "images"
  | "containers"
  | "volumes"
  | "networks"
  | "buildCache"
  | "layerCache"
  | "auth"
  | "context"
  | "contexts"
>;

export type Machine = {
  ip: string;
  /** Noms DNS de la machine (ex: vps.acme.fr). */
  names: string[];
  os: string;
  dockerInstalled: boolean;
  /** Utilisateurs effectivement membres du groupe docker. */
  dockerGroup: string[];
  /** Ajoutés au groupe docker, effectif à la prochaine connexion. */
  pendingGroup: string[];
  password: string;
  passwordAuth: boolean;
  authorizedKeys: string[];
  /** Mot de passe sudo déjà saisi dans la session. */
  sudoCached?: boolean;
  ufw?: { enabled: boolean; rules: string[] };
  /** Instantané des données quand la machine n'est pas active. */
  data: MachineData;
};

export type SimState = {
  user: string;
  hostname: string;
  cwd: string;
  files: FileSystem;
  dirs: string[];
  images: Image[];
  containers: Container[];
  volumes: Volume[];
  networks: Network[];
  shell: ShellSession | null;
  /** Machine active ("local" = le poste de travail). */
  machine: string;
  machines: Record<string, Machine>;
  /** Machines d'origine des sessions ssh ouvertes. */
  sshStack: string[];
  /** Clés des couches déjà construites (cache BuildKit). */
  layerCache: string[];
  contexts: Record<string, DockerContext>;
  /** Utilisateur connecté à Docker Hub. */
  auth: string | null;
  /** Organisations Docker Hub dont l'utilisateur est membre. */
  orgs: string[];
  context: string;
  buildCache: number;
  hub: Record<string, HubRepo>;
  app: AppBehavior;
};

/** Question interactive posée par une commande (mot de passe, confirmation…). */
export type Prompt = {
  label: string;
  mask?: boolean;
  /** Processus au premier plan (docker logs -f…) : seul Ctrl+C l'interrompt. */
  blocking?: boolean;
  respond: (state: SimState, answer: string) => ExecResult;
  interrupt?: (state: SimState) => ExecResult;
};

export type ExecResult = {
  output: string;
  exitCode: number;
  state: SimState;
  prompt?: Prompt;
};

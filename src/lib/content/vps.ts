import type { SimulatorSetup } from "../simulator";
import type { Module } from "../types";

const VPS_IP = "203.0.113.10";

/** Un VPS Ubuntu tout neuf, joignable en ssh par mot de passe. */
const freshVps = (overrides: Partial<NonNullable<SimulatorSetup["machines"]>[string]> = {}): SimulatorSetup["machines"] => ({
  "vps-prod": { ip: VPS_IP, names: ["vps.acme.fr"], user: "deploy", password: "Vps!2024", ...overrides },
});

const STACK = `services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    restart: unless-stopped
`;

const curlVps = [
  ["curl", `http://${VPS_IP}`],
  ["curl", VPS_IP],
  ["curl", `http://${VPS_IP}/`],
  ["curl", "http://vps.acme.fr"],
  ["curl", "vps.acme.fr"],
];

export const vps: Module = {
  id: "vps",
  title: "Déployer sur un VPS avec SSH",
  description: "Clés SSH, installation de Docker sur un serveur, contextes distants et mise en production d'une stack Compose.",
  icon: "server",
  videos: [
    { youtubeId: "osbOiVEmiYo", title: "Configurer un serveur (VPS) de A à Z", author: "Nicely Dev", duration: "18:56", lang: "fr" },
    {
      youtubeId: "pLJC96zfwrE",
      title: "SSH — Clefs : générer et utiliser (ssh-keygen, ssh-copy-id…)",
      author: "xavki",
      duration: "15:07",
      lang: "fr",
    },
    { youtubeId: "Y-S6GtdLaSU", title: "Tutoriel SSH : utiliser une clef SSH", author: "Grafikart.fr", duration: "9:57", lang: "fr" },
    { youtubeId: "x0Kbj4lEOag", title: "Some Context on Docker Contexts", author: "Docker", duration: "10:52", lang: "en" },
    {
      youtubeId: "bpWytcz4uMw",
      title: "Docker and Firewalls — Docker wants to punch holes in the firewall",
      author: "Awesome Open Source",
      duration: "22:41",
      lang: "en",
    },
  ],
  resources: [
    {
      title: "Installer Docker Engine sur Ubuntu",
      url: "https://docs.docker.com/engine/install/ubuntu/",
      kind: "doc",
      lang: "en",
      description: "Dépôt officiel apt ou script get.docker.com, étape par étape.",
    },
    {
      title: "Après l'installation sous Linux",
      url: "https://docs.docker.com/engine/install/linux-postinstall/",
      kind: "doc",
      lang: "en",
      description: "Groupe docker, démarrage automatique, rotation des journaux.",
    },
    {
      title: "Accès distant sécurisé au démon",
      url: "https://docs.docker.com/engine/security/protect-access/",
      kind: "doc",
      lang: "en",
      description: "Piloter un moteur distant par SSH plutôt qu'en exposant son API.",
    },
    {
      title: "Docker et le pare-feu (ufw, iptables)",
      url: "https://docs.docker.com/engine/network/packet-filtering-firewalls/",
      kind: "doc",
      lang: "en",
      description: "Pourquoi un port publié contourne ufw, et comment s'en protéger.",
    },
    {
      title: "Compose en production",
      url: "https://docs.docker.com/compose/how-tos/production/",
      kind: "doc",
      lang: "en",
      description: "Ce qu'il faut changer entre le poste de développement et le serveur.",
    },
    {
      title: "Reverse proxy avec Caddy",
      url: "https://caddyserver.com/docs/quick-starts/reverse-proxy",
      kind: "article",
      lang: "en",
      description: "HTTPS automatique devant tes conteneurs, en quelques lignes.",
    },
    {
      title: "SSH (documentation Ubuntu francophone)",
      url: "https://doc.ubuntu-fr.org/ssh",
      kind: "article",
      lang: "fr",
      description: "Clés, configuration du serveur, sécurisation : la référence en français.",
    },
  ],
  exercises: [
    {
      id: "cle-ssh",
      kind: "command",
      title: "Se connecter avec une clé SSH",
      intro:
        "L'hébergeur t'a envoyé l'adresse du VPS (`203.0.113.10`), l'utilisateur `deploy` et son mot de passe `Vps!2024`. Les mots de passe se devinent et se volent : on se connecte avec une **paire de clés**. La clé privée reste sur ton poste, la clé publique est déposée sur le serveur.",
      setup: { machines: freshVps() },
      steps: [
        {
          instruction:
            "Crée une paire de clés ed25519 avec ton e-mail en commentaire (accepte l'emplacement proposé, sans phrase de passe pour l'exercice).",
          rule: { prefixes: [["ssh-keygen"]], flags: [{ names: ["-t"], value: "ed25519" }] },
          solution: 'ssh-keygen -t ed25519 -C "alex@acme.fr"',
          hint: 'ssh-keygen -t ed25519 -C "commentaire" ; appuie sur Entrée aux questions.',
        },
        {
          instruction: "Affiche ta clé publique : c'est elle qu'on peut partager.",
          rule: {
            prefixes: [
              ["cat", "~/.ssh/id_ed25519.pub"],
              ["cat", "/home/alex/.ssh/id_ed25519.pub"],
            ],
          },
          solution: "cat ~/.ssh/id_ed25519.pub",
          hint: "Elle est dans ~/.ssh/ et se termine par .pub",
        },
        {
          instruction: "Installe ta clé publique sur le serveur (accepte l'empreinte du serveur, puis tape le mot de passe Vps!2024).",
          rule: {
            prefixes: [
              ["ssh-copy-id", `deploy@${VPS_IP}`],
              ["ssh-copy-id", "deploy@vps.acme.fr"],
            ],
          },
          solution: `ssh-copy-id deploy@${VPS_IP}`,
          hint: "ssh-copy-id utilisateur@adresse",
        },
        {
          instruction: "Connecte-toi au serveur : aucun mot de passe ne doit être demandé.",
          rule: {
            prefixes: [
              ["ssh", `deploy@${VPS_IP}`],
              ["ssh", "deploy@vps.acme.fr"],
            ],
          },
          solution: `ssh deploy@${VPS_IP}`,
          hint: "ssh utilisateur@adresse",
        },
        {
          instruction: "Vérifie sur quelle machine tu es (adresse IP du serveur).",
          rule: { prefixes: [["hostname", "-I"]] },
          solution: "hostname -I",
          hint: "hostname -I affiche les adresses de la machine.",
        },
        {
          instruction: "Déconnecte-toi pour revenir sur ton poste.",
          rule: { prefixes: [["exit"], ["logout"]] },
          solution: "exit",
          hint: "exit",
        },
      ],
    },
    {
      id: "installer-docker",
      kind: "command",
      title: "Installer Docker sur le serveur",
      intro:
        "Un VPS neuf n'a pas Docker. Le script officiel `get.docker.com` installe Docker Engine, la CLI, Buildx et Compose. Ensuite, on ajoute l'utilisateur au groupe `docker` pour ne pas devoir taper `sudo` à chaque commande. Le mot de passe sudo de deploy est `Vps!2024`.",
      setup: { sshKey: true, machines: freshVps({ authorizeLocalKey: true, knownByLocal: true }) },
      steps: [
        {
          instruction: "Connecte-toi au serveur.",
          rule: {
            prefixes: [
              ["ssh", `deploy@${VPS_IP}`],
              ["ssh", "deploy@vps.acme.fr"],
            ],
          },
          solution: `ssh deploy@${VPS_IP}`,
          hint: "ta clé est déjà installée.",
        },
        {
          instruction: "Constate que Docker n'est pas installé : tente docker version.",
          rule: {
            prefixes: [
              ["docker", "version"],
              ["docker", "--version"],
            ],
          },
          solution: "docker version",
          hint: "docker version",
          expect: "failure",
        },
        {
          instruction: "Télécharge le script officiel dans get-docker.sh.",
          rule: { prefixes: [["curl"]], flags: [{ names: ["-o"], value: "get-docker.sh" }], args: ["https://get.docker.com"] },
          solution: "curl -fsSL https://get.docker.com -o get-docker.sh",
          hint: "curl -fsSL https://get.docker.com -o get-docker.sh",
        },
        {
          instruction: "Exécute-le en administrateur.",
          rule: { prefixes: [["sudo", "sh", "get-docker.sh"]] },
          solution: "sudo sh get-docker.sh",
          hint: "sudo sh <script>",
        },
        {
          instruction: "Ajoute ton utilisateur au groupe docker.",
          rule: { prefixes: [["sudo", "usermod", "-a", "-G", "docker"]] },
          solution: "sudo usermod -aG docker $USER",
          hint: "sudo usermod -aG docker $USER",
        },
        {
          instruction: "Le groupe ne s'applique qu'à une nouvelle session : déconnecte-toi…",
          rule: { prefixes: [["exit"], ["logout"]] },
          solution: "exit",
          hint: "exit",
        },
        {
          instruction: "… reconnecte-toi au serveur…",
          rule: {
            prefixes: [
              ["ssh", `deploy@${VPS_IP}`],
              ["ssh", "deploy@vps.acme.fr"],
            ],
          },
          solution: `ssh deploy@${VPS_IP}`,
          hint: "ssh deploy@…",
        },
        {
          instruction: "… et vérifie que docker fonctionne sans sudo.",
          rule: {
            prefixes: [
              ["docker", "ps"],
              ["docker", "container", "ls"],
            ],
          },
          solution: "docker ps",
          hint: "docker ps",
        },
      ],
    },
    {
      id: "contexte-distant",
      kind: "command",
      title: "Piloter le serveur depuis son poste",
      intro:
        "Un **contexte** Docker avec un endpoint `ssh://` envoie toutes les commandes `docker` au moteur du serveur, à travers SSH. Les fichiers (compose.yaml, Dockerfile) restent sur ton poste : idéal pour déployer sans copier quoi que ce soit.",
      setup: {
        sshKey: true,
        files: { "compose.yaml": STACK },
        machines: freshVps({ authorizeLocalKey: true, knownByLocal: true, dockerInstalled: true, dockerGroup: true }),
      },
      steps: [
        {
          instruction: `Crée un contexte vps pointant vers ssh://deploy@${VPS_IP}.`,
          rule: {
            prefixes: [["docker", "context", "create", "vps"]],
            flags: [{ names: ["--docker"], value: `host=ssh://deploy@${VPS_IP}` }],
          },
          solution: `docker context create vps --docker "host=ssh://deploy@${VPS_IP}"`,
          hint: 'docker context create <nom> --docker "host=ssh://utilisateur@adresse"',
        },
        {
          instruction: "Liste les contextes.",
          rule: {
            prefixes: [
              ["docker", "context", "ls"],
              ["docker", "context", "list"],
            ],
          },
          solution: "docker context ls",
          hint: "docker context ls",
        },
        {
          instruction: "Bascule sur le contexte vps.",
          rule: { prefixes: [["docker", "context", "use", "vps"]] },
          solution: "docker context use vps",
          hint: "docker context use <nom>",
        },
        {
          instruction: "Déploie la stack du compose.yaml local sur le serveur, en arrière-plan.",
          rule: { prefixes: [["docker", "compose", "up"]], flags: [{ names: ["-d", "--detach"] }] },
          solution: "docker compose up -d",
          hint: "Exactement la même commande qu'en local.",
        },
        {
          instruction: "Vérifie depuis ton poste que le site répond sur l'adresse publique du serveur.",
          rule: { prefixes: curlVps },
          solution: `curl http://${VPS_IP}`,
          hint: `curl http://${VPS_IP}`,
        },
        {
          instruction: "Reviens sur le moteur local (contexte default).",
          rule: {
            prefixes: [
              ["docker", "context", "use", "default"],
              ["docker", "context", "use", "desktop-linux"],
            ],
          },
          solution: "docker context use default",
          hint: "docker context use default",
        },
      ],
    },
    {
      id: "deployer-par-ssh",
      kind: "command",
      title: "Déployer en copiant les fichiers",
      intro:
        "L'autre méthode, très répandue : copier le `compose.yaml` sur le serveur avec `scp`, puis lancer Compose **sur le serveur**. Les images viennent de Docker Hub : on ne construit jamais en production.",
      setup: {
        sshKey: true,
        files: { "compose.yaml": STACK },
        machines: freshVps({ authorizeLocalKey: true, knownByLocal: true, dockerInstalled: true, dockerGroup: true, dirs: ["app"] }),
      },
      steps: [
        {
          instruction: "Copie compose.yaml dans le dossier ~/app du serveur.",
          rule: { prefixes: [["scp", "compose.yaml"]] },
          solution: `scp compose.yaml deploy@${VPS_IP}:~/app/`,
          hint: "scp <fichier> utilisateur@adresse:<dossier>/",
        },
        {
          instruction: "Connecte-toi au serveur.",
          rule: {
            prefixes: [
              ["ssh", `deploy@${VPS_IP}`],
              ["ssh", "deploy@vps.acme.fr"],
            ],
          },
          solution: `ssh deploy@${VPS_IP}`,
          hint: "ssh deploy@…",
        },
        {
          instruction: "Place-toi dans le dossier app.",
          rule: {
            prefixes: [
              ["cd", "app"],
              ["cd", "~/app"],
              ["cd", "/home/deploy/app"],
            ],
          },
          solution: "cd app",
          hint: "cd app",
        },
        {
          instruction: "Télécharge les images de la stack.",
          rule: { prefixes: [["docker", "compose", "pull"]] },
          solution: "docker compose pull",
          hint: "docker compose pull",
        },
        {
          instruction: "Démarre la stack en arrière-plan.",
          rule: { prefixes: [["docker", "compose", "up"]], flags: [{ names: ["-d", "--detach"] }] },
          solution: "docker compose up -d",
          hint: "docker compose up -d",
        },
        {
          instruction: "Déconnecte-toi.",
          rule: { prefixes: [["exit"], ["logout"]] },
          solution: "exit",
          hint: "exit",
        },
        {
          instruction: "Vérifie depuis ton poste que le site est en ligne.",
          rule: { prefixes: curlVps },
          solution: `curl http://${VPS_IP}`,
          hint: `curl http://${VPS_IP}`,
        },
      ],
    },
    {
      id: "port-prive",
      kind: "command",
      title: "Ne pas exposer la base de données",
      intro:
        "Sur un serveur, `-p 5432:5432` ouvre la base **à tout Internet**, et le pare-feu `ufw` ne la protège pas : Docker écrit ses propres règles. Pour un accès local uniquement, on lie le port à `127.0.0.1` (ou on ne le publie pas du tout).",
      setup: {
        machines: freshVps({
          dockerInstalled: true,
          dockerGroup: true,
          knownByLocal: true,
          commands: ["docker run -d --name db -p 5432:5432 -e POSTGRES_PASSWORD=secret postgres:16"],
        }),
      },
      steps: [
        {
          instruction: `Depuis ton poste, teste si le port 5432 du serveur est ouvert.`,
          rule: { prefixes: [["nc"]], flags: [{ names: ["-z"] }], args: [VPS_IP, "5432"] },
          solution: `nc -zv ${VPS_IP} 5432`,
          hint: "nc -zv <adresse> <port>",
        },
        {
          instruction: "Connecte-toi au serveur (mot de passe Vps!2024).",
          rule: {
            prefixes: [
              ["ssh", `deploy@${VPS_IP}`],
              ["ssh", "deploy@vps.acme.fr"],
            ],
          },
          solution: `ssh deploy@${VPS_IP}`,
          hint: "ssh deploy@…",
        },
        {
          instruction: "Supprime le conteneur db (pour l'exercice : il n'a pas de volume de données).",
          rule: {
            prefixes: [
              ["docker", "rm"],
              ["docker", "container", "rm"],
            ],
            flags: [{ names: ["-f", "--force"] }],
            args: ["db"],
          },
          solution: "docker rm -f db",
          hint: "docker rm -f <nom>",
        },
        {
          instruction: "Relance-le en publiant 5432 uniquement sur 127.0.0.1.",
          rule: {
            prefixes: [
              ["docker", "run"],
              ["docker", "container", "run"],
            ],
            flags: [
              { names: ["-d", "--detach"] },
              { names: ["--name"], value: "db" },
              { names: ["-p", "--publish"], value: "127.0.0.1:5432:5432" },
              { names: ["-e", "--env"], value: "POSTGRES_PASSWORD=secret" },
            ],
            args: ["postgres:16"],
          },
          solution: "docker run -d --name db -p 127.0.0.1:5432:5432 -e POSTGRES_PASSWORD=secret postgres:16",
          hint: "-p 127.0.0.1:<hôte>:<conteneur>",
        },
        {
          instruction: "Sur le serveur, vérifie que la base reste joignable localement.",
          rule: { prefixes: [["nc"]], flags: [{ names: ["-z"] }], args: ["localhost", "5432"] },
          solution: "nc -zv localhost 5432",
          hint: "nc -zv localhost 5432",
        },
        {
          instruction: "Déconnecte-toi.",
          rule: { prefixes: [["exit"], ["logout"]] },
          solution: "exit",
          hint: "exit",
        },
        {
          instruction: "Depuis ton poste, le port doit maintenant être fermé.",
          rule: { prefixes: [["nc"]], flags: [{ names: ["-z"] }], args: [VPS_IP, "5432"] },
          solution: `nc -zv ${VPS_IP} 5432`,
          hint: "Même commande qu'à l'étape 1.",
          expect: "failure",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Quelle partie d'une paire de clés SSH dépose-t-on sur le serveur ?",
      choices: ["La clé privée", "La clé publique (.pub)", "Les deux", "Aucune, on envoie le mot de passe"],
      answer: 1,
      explanation: "La clé privée ne quitte jamais ton poste. `ssh-copy-id` ajoute la clé publique dans ~/.ssh/authorized_keys du serveur.",
    },
    {
      question: "Après `sudo usermod -aG docker deploy`, `docker ps` répond encore « permission denied ». Pourquoi ?",
      choices: [
        "L'installation a échoué",
        "L'appartenance au groupe n'est prise en compte qu'à la prochaine session : il faut se déconnecter et se reconnecter",
        "Il faut redémarrer le serveur",
        "deploy n'a pas le droit d'utiliser Docker",
      ],
      answer: 1,
      explanation: "On peut aussi lancer `newgrp docker` dans la session courante.",
    },
    {
      question: "Que fait `docker context use vps` (contexte ssh://deploy@serveur) ?",
      choices: [
        "Il copie les fichiers sur le serveur",
        "Les commandes docker suivantes s'exécutent sur le moteur du serveur, à travers SSH",
        "Il ouvre un shell sur le serveur",
        "Il installe Docker sur le serveur",
      ],
      answer: 1,
      explanation: "Les fichiers lus par la CLI (compose.yaml, contexte de build) restent ceux du poste ; seul le moteur change.",
    },
    {
      question:
        "Le pare-feu ufw du serveur n'autorise que le port 22, mais ta base publiée avec `-p 5432:5432` est joignable depuis Internet. Pourquoi ?",
      choices: [
        "ufw est mal installé",
        "Docker ajoute ses propres règles iptables qui passent avant celles d'ufw",
        "Postgres ouvre le port lui-même",
        "C'est impossible",
      ],
      answer: 1,
      explanation:
        "Solution : ne pas publier le port, ou le lier à `127.0.0.1:5432:5432`, et réserver la publication au reverse proxy (80/443).",
    },
    {
      question: "Comment mettre à jour une stack déployée sur un serveur avec une nouvelle version de l'image ?",
      choices: [
        "docker compose build sur le serveur",
        "Changer le tag (ex. dans .env), puis docker compose pull && docker compose up -d",
        "docker compose down -v puis up",
        "Redémarrer le serveur",
      ],
      answer: 1,
      explanation: "`up -d` recrée seulement les services dont l'image ou la configuration a changé ; les volumes sont conservés.",
    },
    {
      question: "Quelle est la bonne pratique pour exposer une application web en HTTPS sur un VPS ?",
      choices: [
        "Publier chaque conteneur sur un port différent",
        "Un reverse proxy (Caddy, Traefik, nginx) sur 80/443, qui gère les certificats et redirige vers les conteneurs",
        "Désactiver le pare-feu",
        "Utiliser docker context",
      ],
      answer: 1,
      explanation: "Seul le proxy est exposé ; les applications restent sur le réseau Docker interne.",
    },
  ],
};

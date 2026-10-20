import type { Module } from "../types";
import { API_FS } from "./fixtures";

const run = [
  ["docker", "run"],
  ["docker", "container", "run"],
];

export const conteneurs: Module = {
  id: "conteneurs",
  title: "Les conteneurs",
  description: "Lancer, lister, arrêter, inspecter et entrer dans des conteneurs.",
  icon: "box",
  videos: [
    { youtubeId: "5AXboiBF8nM", title: "Lancer un conteneur", author: "xavki", duration: "11:47", lang: "fr" },
    { youtubeId: "Cx0BNPsPmoU", title: "Docker exec vs attach", author: "xavki", duration: "13:24", lang: "fr" },
    { youtubeId: "eGz9DS-aIeY", title: "you need to learn Docker RIGHT NOW!!", author: "NetworkChuck", duration: "23:19", lang: "en" },
  ],
  resources: [
    {
      title: "Référence docker run",
      url: "https://docs.docker.com/reference/cli/docker/container/run/",
      kind: "doc",
      lang: "en",
      description: "Toutes les options de docker run, avec des exemples.",
    },
    {
      title: "Publier des ports",
      url: "https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/",
      kind: "doc",
      lang: "en",
      description: "Comprendre -p hôte:conteneur avec un exercice pratique.",
    },
    {
      title: "Référence docker exec",
      url: "https://docs.docker.com/reference/cli/docker/container/exec/",
      kind: "doc",
      lang: "en",
      description: "Exécuter des commandes dans un conteneur en cours d'exécution.",
    },
    {
      title: "Killercoda — scénarios Docker",
      url: "https://killercoda.com/docker",
      kind: "lab",
      lang: "en",
      description: "Des scénarios interactifs gratuits dans un vrai terminal en ligne.",
    },
  ],
  exercises: [
    {
      id: "lancer-serveur-web",
      kind: "command",
      title: "Lancer un serveur web",
      intro:
        "Options essentielles de `docker run` : `-d` (détaché, en arrière-plan), `-p hôte:conteneur` (publier un port), `--name` (nommer le conteneur).",
      steps: [
        {
          instruction: "Lance nginx en arrière-plan, nommé web, en publiant le port 8080 de ta machine vers le port 80 du conteneur.",
          rule: {
            prefixes: run,
            flags: [{ names: ["-d", "--detach"] }, { names: ["-p", "--publish"], value: "8080:80" }, { names: ["--name"], value: "web" }],
            args: ["nginx"],
          },
          solution: "docker run -d -p 8080:80 --name web nginx",
          hint: "docker run -d -p <hôte>:<conteneur> --name <nom> <image>",
        },
        {
          instruction: "Liste les conteneurs en cours d'exécution.",
          rule: {
            prefixes: [
              ["docker", "ps"],
              ["docker", "container", "ls"],
              ["docker", "container", "list"],
            ],
          },
          solution: "docker ps",
          hint: "ps = process status",
        },
        {
          instruction: "Affiche les logs du conteneur web.",
          rule: {
            prefixes: [
              ["docker", "logs"],
              ["docker", "container", "logs"],
            ],
            args: ["web"],
          },
          solution: "docker logs web",
          hint: "docker logs <nom>",
        },
        {
          instruction: "Suis les logs du conteneur web en temps réel (mode follow), puis arrête avec Ctrl+C.",
          rule: {
            prefixes: [
              ["docker", "logs"],
              ["docker", "container", "logs"],
            ],
            flags: [{ names: ["-f", "--follow"] }],
            args: ["web"],
          },
          solution: "docker logs -f web",
          hint: "L'option -f signifie « follow »",
        },
      ],
    },
    {
      id: "cycle-de-vie",
      kind: "command",
      setup: {
        containers: [
          { name: "web", image: "nginx", ports: ["8080:80"] },
          { name: "eager_turing", image: "hello-world", status: "exited" },
        ],
      },
      title: "Cycle de vie d'un conteneur",
      intro:
        "Un conteneur peut être arrêté (`stop`), redémarré (`start`, `restart`) puis supprimé (`rm`). Un conteneur arrêté existe toujours : il n'apparaît qu'avec `docker ps -a`.",
      steps: [
        {
          instruction: "Arrête le conteneur web.",
          rule: {
            prefixes: [
              ["docker", "stop"],
              ["docker", "container", "stop"],
            ],
            args: ["web"],
          },
          solution: "docker stop web",
          hint: "docker stop <nom>",
        },
        {
          instruction: "Liste TOUS les conteneurs, y compris ceux qui sont arrêtés.",
          rule: {
            prefixes: [
              ["docker", "ps"],
              ["docker", "container", "ls"],
            ],
            flags: [{ names: ["-a", "--all"] }],
          },
          solution: "docker ps -a",
          hint: "-a pour « all »",
        },
        {
          instruction: "Redémarre le conteneur web.",
          rule: {
            prefixes: [
              ["docker", "start"],
              ["docker", "container", "start"],
              ["docker", "restart"],
            ],
            args: ["web"],
          },
          solution: "docker start web",
          hint: "L'inverse de stop",
        },
        {
          instruction: "Supprime le conteneur web de force (même s'il tourne).",
          rule: {
            prefixes: [
              ["docker", "rm"],
              ["docker", "container", "rm"],
            ],
            flags: [{ names: ["-f", "--force"] }],
            args: ["web"],
          },
          solution: "docker rm -f web",
          hint: "docker rm avec l'option force",
        },
      ],
    },
    {
      id: "mode-interactif",
      kind: "command",
      setup: {
        customImages: [{ ref: "mon-api", base: "node:22-alpine", fs: API_FS }],
        containers: [{ name: "api", image: "mon-api", ports: ["3000:3000"] }],
      },
      title: "Entrer dans un conteneur",
      intro:
        "`-it` combine `-i` (interactif) et `-t` (terminal) pour obtenir un shell. `--rm` supprime le conteneur automatiquement à sa sortie. `docker exec` exécute une commande dans un conteneur déjà lancé.",
      steps: [
        {
          instruction: "Lance un conteneur ubuntu interactif avec un shell bash, supprimé automatiquement à la sortie.",
          rule: {
            prefixes: run,
            flags: [{ names: ["-i", "--interactive"] }, { names: ["-t", "--tty"] }, { names: ["--rm"] }],
            args: ["ubuntu", "bash"],
          },
          solution: "docker run -it --rm ubuntu bash",
          hint: "docker run -it --rm <image> <commande>",
        },
        {
          instruction: "Quitte le shell ubuntu (exit). Un conteneur nommé api tourne déjà : ouvre un shell sh à l'intérieur.",
          rule: {
            prefixes: [
              ["docker", "exec"],
              ["docker", "container", "exec"],
            ],
            flags: [{ names: ["-i", "--interactive"] }, { names: ["-t", "--tty"] }],
            args: ["api", "sh"],
          },
          solution: "docker exec -it api sh",
          hint: "docker exec -it <conteneur> <commande>. L'image est basée sur Alpine : bash n'existe pas, mais sh oui.",
        },
        {
          instruction: "Quitte le shell (exit) puis, sans en ouvrir un nouveau, exécute la commande ls /app dans le conteneur api.",
          rule: {
            prefixes: [
              ["docker", "exec"],
              ["docker", "container", "exec"],
            ],
            args: ["api", "ls", "/app"],
          },
          solution: "docker exec api ls /app",
          hint: "docker exec <conteneur> <commande> <arguments>",
        },
      ],
    },
    {
      id: "variables-et-inspection",
      kind: "command",
      title: "Variables d'environnement et inspection",
      intro:
        "`-e CLE=valeur` passe une variable d'environnement au conteneur (mot de passe, configuration…). `docker inspect` et `docker stats` permettent d'observer un conteneur.",
      steps: [
        {
          instruction: "Lance postgres en arrière-plan, nommé db, avec la variable POSTGRES_PASSWORD=secret.",
          rule: {
            prefixes: run,
            flags: [
              { names: ["-d", "--detach"] },
              { names: ["--name"], value: "db" },
              { names: ["-e", "--env"], value: "POSTGRES_PASSWORD=secret" },
            ],
            args: ["postgres"],
          },
          solution: "docker run -d --name db -e POSTGRES_PASSWORD=secret postgres",
          hint: "-e NOM=valeur",
        },
        {
          instruction: "Inspecte le conteneur db.",
          rule: {
            prefixes: [
              ["docker", "inspect"],
              ["docker", "container", "inspect"],
            ],
            args: ["db"],
          },
          solution: "docker inspect db",
          hint: "docker inspect <nom>",
        },
        {
          instruction: "Affiche la consommation CPU / mémoire des conteneurs en temps réel.",
          rule: {
            prefixes: [
              ["docker", "stats"],
              ["docker", "container", "stats"],
            ],
          },
          solution: "docker stats",
          hint: "statistiques…",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Dans `-p 3000:80`, que représente 3000 ?",
      choices: ["Le port du conteneur", "Le port de ta machine (hôte)", "Le nombre de requêtes max", "L'ID du processus"],
      answer: 1,
      explanation: "Le format est toujours `hôte:conteneur`. On accède donc à l'app via http://localhost:3000.",
    },
    {
      question: "Que fait l'option `-d` de `docker run` ?",
      choices: ["Supprime le conteneur à la fin", "Active le mode debug", "Lance le conteneur en arrière-plan", "Télécharge l'image"],
      answer: 2,
      explanation: "`-d` = detached : le terminal est libéré et Docker affiche l'ID du conteneur.",
    },
    {
      question: "Un conteneur arrêté n'apparaît pas dans `docker ps`. Comment le voir ?",
      choices: ["docker ps -a", "docker ps --stopped", "docker images", "docker logs"],
      answer: 0,
      explanation: "`-a` (all) affiche aussi les conteneurs arrêtés.",
    },
    {
      question: "Quelle est la différence entre `docker run` et `docker exec` ?",
      choices: [
        "Aucune",
        "`run` crée un nouveau conteneur ; `exec` exécute une commande dans un conteneur existant et démarré",
        "`exec` crée un conteneur sans le démarrer",
        "`run` ne fonctionne qu'avec Docker Hub",
      ],
      answer: 1,
      explanation: "On utilise `exec` pour déboguer un conteneur qui tourne déjà, par exemple `docker exec -it api sh`.",
    },
    {
      question: "À quoi sert `--rm` ?",
      choices: [
        "À supprimer l'image après usage",
        "À supprimer automatiquement le conteneur quand il s'arrête",
        "À supprimer tous les conteneurs",
        "À redémarrer le conteneur en cas d'erreur",
      ],
      answer: 1,
      explanation: "Pratique pour des conteneurs jetables : pas de conteneur « Exited » qui s'accumule.",
    },
    {
      question: "Comment suivre les logs d'un conteneur en direct ?",
      choices: ["docker logs --live web", "docker tail web", "docker logs -f web", "docker watch web"],
      answer: 2,
      explanation: "`-f` (follow) fonctionne comme `tail -f`. Ctrl+C pour quitter.",
    },
    {
      question: "Que fait `docker stop` par rapport à `docker kill` ?",
      choices: [
        "`stop` envoie SIGTERM et laisse le temps de s'arrêter proprement ; `kill` arrête immédiatement (SIGKILL)",
        "Ils sont identiques",
        "`stop` supprime le conteneur",
        "`kill` met le conteneur en pause",
      ],
      answer: 0,
      explanation: "`stop` attend 10 secondes par défaut avant de forcer l'arrêt.",
    },
  ],
};

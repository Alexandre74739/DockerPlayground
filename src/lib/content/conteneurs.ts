import type { Module } from "../types";

const run = [["docker", "run"], ["docker", "container", "run"]];

export const conteneurs: Module = {
  id: "conteneurs",
  title: "Les conteneurs",
  description: "Lancer, lister, arrêter, inspecter et entrer dans des conteneurs.",
  icon: "📦",
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
            flags: [
              { names: ["-d", "--detach"] },
              { names: ["-p", "--publish"], value: "8080:80" },
              { names: ["--name"], value: "web" },
            ],
            args: ["nginx"],
          },
          solution: "docker run -d -p 8080:80 --name web nginx",
          hint: "docker run -d -p <hôte>:<conteneur> --name <nom> <image>",
          output: "a3f1c9e5b7d24f6e8a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
        },
        {
          instruction: "Liste les conteneurs en cours d'exécution.",
          rule: { prefixes: [["docker", "ps"], ["docker", "container", "ls"], ["docker", "container", "list"]] },
          solution: "docker ps",
          hint: "ps = process status",
          output: `CONTAINER ID   IMAGE   COMMAND                  CREATED          STATUS          PORTS                  NAMES
a3f1c9e5b7d2   nginx   "/docker-entrypoint.…"   10 seconds ago   Up 9 seconds    0.0.0.0:8080->80/tcp   web`,
        },
        {
          instruction: "Affiche les logs du conteneur web.",
          rule: { prefixes: [["docker", "logs"], ["docker", "container", "logs"]], args: ["web"] },
          solution: "docker logs web",
          hint: "docker logs <nom>",
          output: `/docker-entrypoint.sh: Configuration complete; ready for start up
2026/10/20 10:12:01 [notice] 1#1: nginx/1.27.2
2026/10/20 10:12:01 [notice] 1#1: start worker processes
172.17.0.1 - - [20/Oct/2026:10:12:30 +0000] "GET / HTTP/1.1" 200 615 "-" "Mozilla/5.0"`,
        },
        {
          instruction: "Suis les logs du conteneur web en temps réel (mode follow).",
          rule: {
            prefixes: [["docker", "logs"], ["docker", "container", "logs"]],
            flags: [{ names: ["-f", "--follow"] }],
            args: ["web"],
          },
          solution: "docker logs -f web",
          hint: "L'option -f signifie « follow »",
          output: `172.17.0.1 - - [20/Oct/2026:10:13:02 +0000] "GET / HTTP/1.1" 200 615
^C`,
        },
      ],
    },
    {
      id: "cycle-de-vie",
      kind: "command",
      title: "Cycle de vie d'un conteneur",
      intro:
        "Un conteneur peut être arrêté (`stop`), redémarré (`start`, `restart`) puis supprimé (`rm`). Un conteneur arrêté existe toujours : il n'apparaît qu'avec `docker ps -a`.",
      steps: [
        {
          instruction: "Arrête le conteneur web.",
          rule: { prefixes: [["docker", "stop"], ["docker", "container", "stop"]], args: ["web"] },
          solution: "docker stop web",
          hint: "docker stop <nom>",
          output: "web",
        },
        {
          instruction: "Liste TOUS les conteneurs, y compris ceux qui sont arrêtés.",
          rule: {
            prefixes: [["docker", "ps"], ["docker", "container", "ls"]],
            flags: [{ names: ["-a", "--all"] }],
          },
          solution: "docker ps -a",
          hint: "-a pour « all »",
          output: `CONTAINER ID   IMAGE         COMMAND                  CREATED          STATUS                      PORTS   NAMES
a3f1c9e5b7d2   nginx         "/docker-entrypoint.…"   5 minutes ago    Exited (0) 3 seconds ago            web
7b2e4d6f8a1c   hello-world   "/hello"                 20 minutes ago   Exited (0) 20 minutes ago           eager_turing`,
        },
        {
          instruction: "Redémarre le conteneur web.",
          rule: { prefixes: [["docker", "start"], ["docker", "container", "start"], ["docker", "restart"]], args: ["web"] },
          solution: "docker start web",
          hint: "L'inverse de stop",
          output: "web",
        },
        {
          instruction: "Supprime le conteneur web de force (même s'il tourne).",
          rule: {
            prefixes: [["docker", "rm"], ["docker", "container", "rm"]],
            flags: [{ names: ["-f", "--force"] }],
            args: ["web"],
          },
          solution: "docker rm -f web",
          hint: "docker rm avec l'option force",
          output: "web",
        },
      ],
    },
    {
      id: "mode-interactif",
      kind: "command",
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
          output: `root@4f2a9c1b3d5e:/# exit
exit`,
        },
        {
          instruction: "Un conteneur nommé api tourne. Ouvre un shell sh à l'intérieur.",
          rule: {
            prefixes: [["docker", "exec"], ["docker", "container", "exec"]],
            flags: [{ names: ["-i", "--interactive"] }, { names: ["-t", "--tty"] }],
            args: ["api", "sh"],
          },
          solution: "docker exec -it api sh",
          hint: "docker exec -it <conteneur> <commande>",
          output: "/app # ",
        },
        {
          instruction: "Sans ouvrir de shell, exécute la commande ls /app dans le conteneur api.",
          rule: { prefixes: [["docker", "exec"], ["docker", "container", "exec"]], args: ["api", "ls", "/app"] },
          solution: "docker exec api ls /app",
          hint: "docker exec <conteneur> <commande> <arguments>",
          output: `node_modules
package.json
server.js`,
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
          output: "e8c1f3a5b7d94e2f6a8b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f",
        },
        {
          instruction: "Inspecte le conteneur db.",
          rule: { prefixes: [["docker", "inspect"], ["docker", "container", "inspect"]], args: ["db"] },
          solution: "docker inspect db",
          hint: "docker inspect <nom>",
          output: `[
    {
        "Id": "e8c1f3a5b7d9…",
        "Name": "/db",
        "State": { "Status": "running", "Running": true },
        "Config": {
            "Env": ["POSTGRES_PASSWORD=secret", "PGDATA=/var/lib/postgresql/data"]
        },
        "NetworkSettings": { "IPAddress": "172.17.0.3" }
    }
]`,
        },
        {
          instruction: "Affiche la consommation CPU / mémoire des conteneurs en temps réel.",
          rule: { prefixes: [["docker", "stats"], ["docker", "container", "stats"]] },
          solution: "docker stats",
          hint: "statistiques…",
          output: `CONTAINER ID   NAME   CPU %   MEM USAGE / LIMIT     MEM %   NET I/O         BLOCK I/O
e8c1f3a5b7d9   db     0.02%   38.5MiB / 7.6GiB      0.49%   1.2kB / 0B      0B / 49MB`,
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

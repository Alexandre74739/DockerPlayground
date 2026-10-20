import type { Module } from "../types";

export const maintenance: Module = {
  id: "maintenance",
  title: "Nettoyage & Docker Desktop",
  description: "Libérer de l'espace, surveiller et retrouver ses repères dans Docker Desktop.",
  icon: "🧹",
  exercises: [
    {
      id: "espace-disque",
      kind: "command",
      title: "Faire le ménage",
      intro:
        "Images, conteneurs arrêtés, volumes et cache de build s'accumulent vite. Docker fournit des commandes `prune` pour nettoyer.",
      steps: [
        {
          instruction: "Affiche l'espace disque utilisé par Docker.",
          rule: { prefixes: [["docker", "system", "df"]] },
          solution: "docker system df",
          hint: "df = disk free (comme sous Linux)",
          output: `TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          8         2         2.31GB    1.65GB (71%)
Containers      5         1         12.4MB    12.3MB (99%)
Local Volumes   3         1         245MB     180MB (73%)
Build Cache     42        0         890MB     890MB`,
        },
        {
          instruction: "Supprime tous les conteneurs arrêtés.",
          rule: { prefixes: [["docker", "container", "prune"]] },
          solution: "docker container prune",
          hint: "docker container prune",
          output: `WARNING! This will remove all stopped containers.
Are you sure you want to continue? [y/N] y
Deleted Containers:
7b2e4d6f8a1c…
Total reclaimed space: 12.3MB`,
        },
        {
          instruction: "Supprime les volumes non utilisés.",
          rule: { prefixes: [["docker", "volume", "prune"]] },
          solution: "docker volume prune",
          hint: "Même logique pour les volumes",
          output: `WARNING! This will remove anonymous local volumes not used by at least one container.
Are you sure you want to continue? [y/N] y
Total reclaimed space: 180MB`,
        },
        {
          instruction: "Grand ménage : supprime tout ce qui est inutilisé, y compris toutes les images non utilisées.",
          rule: { prefixes: [["docker", "system", "prune"]], flags: [{ names: ["-a", "--all"] }] },
          solution: "docker system prune -a",
          hint: "docker system prune avec l'option all",
          output: `WARNING! This will remove:
  - all stopped containers
  - all networks not used by at least one container
  - all images without at least one container associated to them
  - all build cache
Are you sure you want to continue? [y/N] y
Total reclaimed space: 2.54GB`,
        },
      ],
    },
    {
      id: "contextes-desktop",
      kind: "command",
      title: "Contextes et diagnostic",
      intro:
        "Un contexte indique à la CLI quel moteur Docker piloter. Docker Desktop crée le contexte `desktop-linux`. Utile si Docker « ne répond pas » : vérifie le contexte actif.",
      steps: [
        {
          instruction: "Liste les contextes Docker.",
          rule: { prefixes: [["docker", "context", "ls"], ["docker", "context", "list"]] },
          solution: "docker context ls",
          hint: "docker context ls",
          output: `NAME                DESCRIPTION                               DOCKER ENDPOINT
default             Current DOCKER_HOST based configuration   unix:///var/run/docker.sock
desktop-linux *     Docker Desktop                            npipe:////./pipe/dockerDesktopLinuxEngine`,
        },
        {
          instruction: "Bascule sur le contexte desktop-linux.",
          rule: { prefixes: [["docker", "context", "use"]], args: ["desktop-linux"] },
          solution: "docker context use desktop-linux",
          hint: "docker context use <nom>",
          output: `desktop-linux
Current context is now "desktop-linux"`,
        },
        {
          instruction: "Affiche les processus qui tournent dans le conteneur web.",
          rule: { prefixes: [["docker", "top"], ["docker", "container", "top"]], args: ["web"] },
          solution: "docker top web",
          hint: "Comme la commande Linux top",
          output: `UID     PID     PPID    C   STIME   TTY   TIME       CMD
root    2101    2080    0   10:12   ?     00:00:00   nginx: master process nginx -g daemon off;
101     2150    2101    0   10:12   ?     00:00:00   nginx: worker process`,
        },
        {
          instruction: "Copie le fichier /etc/nginx/nginx.conf du conteneur web vers le dossier courant.",
          rule: { prefixes: [["docker", "cp"], ["docker", "container", "cp"]], args: ["web:/etc/nginx/nginx.conf", "."] },
          solution: "docker cp web:/etc/nginx/nginx.conf .",
          hint: "docker cp <conteneur>:<chemin> <destination>",
          output: "Successfully copied 2.56kB to /home/alex/.",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Quelle commande montre l'espace disque utilisé par Docker ?",
      choices: ["docker du", "docker system df", "docker disk", "docker info --size"],
      answer: 1,
      explanation: "`docker system df` détaille images, conteneurs, volumes et cache, avec ce qui est récupérable.",
    },
    {
      question: "`docker system prune` (sans option) supprime-t-il les volumes ?",
      choices: ["Oui, toujours", "Non, il faut ajouter --volumes", "Seulement sous Windows", "Seulement les volumes nommés"],
      answer: 1,
      explanation: "Par sécurité, les volumes (donc les données) ne sont supprimés qu'avec `--volumes`.",
    },
    {
      question: "Dans Docker Desktop, où retrouves-tu les conteneurs lancés en CLI ?",
      choices: [
        "Nulle part, la CLI et l'interface sont séparées",
        "Dans l'onglet « Containers »",
        "Dans l'onglet « Extensions »",
        "Sur Docker Hub",
      ],
      answer: 1,
      explanation: "L'interface et la CLI pilotent le même moteur : tout ce que tu fais en ligne de commande y apparaît.",
    },
    {
      question: "Le message « Cannot connect to the Docker daemon » apparaît. Première chose à vérifier ?",
      choices: [
        "Réinstaller Windows",
        "Que Docker Desktop est bien lancé (moteur démarré)",
        "Supprimer toutes les images",
        "Se connecter à Docker Hub",
      ],
      answer: 1,
      explanation: "La CLI a besoin du moteur. Ensuite, vérifier le contexte actif avec `docker context ls`.",
    },
    {
      question: "Comment copier un fichier depuis un conteneur vers ta machine ?",
      choices: ["docker export", "docker cp conteneur:/chemin .", "docker save", "docker mv"],
      answer: 1,
      explanation: "`docker cp` fonctionne dans les deux sens (hôte → conteneur et conteneur → hôte).",
    },
  ],
};

import type { Module } from "../types";

export const images: Module = {
  id: "images",
  title: "Les images",
  description: "Télécharger, lister, inspecter, taguer et supprimer des images.",
  icon: "🖼️",
  exercises: [
    {
      id: "pull-et-lister",
      kind: "command",
      title: "Télécharger et lister",
      intro:
        "Une image se compose d'un nom et d'un tag (`nginx:1.27`). Sans tag, Docker utilise `latest`. `docker pull` télécharge une image sans la lancer.",
      steps: [
        {
          instruction: "Télécharge l'image nginx (sans préciser de tag).",
          rule: { prefixes: [["docker", "pull"], ["docker", "image", "pull"]], args: ["nginx"] },
          solution: "docker pull nginx",
          hint: "docker pull <image>",
          output: `Using default tag: latest
latest: Pulling from library/nginx
a480a496ba95: Pull complete
f3ace1b8ce45: Pull complete
Digest: sha256:28402db69fec7c17e179ea87882667f1e054391138f77ffaf0c3eb388efc3ffb
Status: Downloaded newer image for nginx:latest
docker.io/library/nginx:latest`,
        },
        {
          instruction: "Télécharge l'image node en version 22-alpine (tag 22-alpine).",
          rule: { prefixes: [["docker", "pull"], ["docker", "image", "pull"]], args: ["node:22-alpine"] },
          solution: "docker pull node:22-alpine",
          hint: "Le tag se place après le nom, séparé par « : »",
          output: `22-alpine: Pulling from library/node
Status: Downloaded newer image for node:22-alpine
docker.io/library/node:22-alpine`,
        },
        {
          instruction: "Liste toutes les images présentes localement.",
          rule: { prefixes: [["docker", "images"], ["docker", "image", "ls"], ["docker", "image", "list"]] },
          solution: "docker images",
          hint: "Le pluriel de « image »… ou docker image ls",
          output: `REPOSITORY   TAG         IMAGE ID       CREATED       SIZE
nginx        latest      39286ab8a5e1   2 weeks ago   188MB
node         22-alpine   dbcd2d5da5a1   3 weeks ago   157MB
hello-world  latest      d2c94e258dcb   1 year ago    13.3kB`,
        },
      ],
    },
    {
      id: "inspecter-taguer",
      kind: "command",
      title: "Inspecter et taguer",
      intro:
        "`docker image inspect` affiche les métadonnées JSON d'une image. `docker tag` crée un nouveau nom (alias) pointant vers la même image — indispensable avant de publier sur Docker Hub.",
      steps: [
        {
          instruction: "Inspecte l'image nginx.",
          rule: { prefixes: [["docker", "image", "inspect"], ["docker", "inspect"]], args: ["nginx"] },
          solution: "docker image inspect nginx",
          hint: "docker image inspect <image>",
          output: `[
    {
        "Id": "sha256:39286ab8a5e14aeaf5fdd6e2fac76e0c8d31a0c07224f0ee5e6be502f12e93f3",
        "RepoTags": ["nginx:latest"],
        "Config": {
            "ExposedPorts": { "80/tcp": {} },
            "Cmd": ["nginx", "-g", "daemon off;"]
        },
        "Architecture": "amd64",
        "Os": "linux"
    }
]`,
        },
        {
          instruction: "Crée un tag mon-nginx:v1 à partir de l'image nginx.",
          rule: { prefixes: [["docker", "tag"], ["docker", "image", "tag"]], args: ["nginx", "mon-nginx:v1"] },
          solution: "docker tag nginx mon-nginx:v1",
          hint: "docker tag <source> <cible>",
          output: "",
        },
        {
          instruction: "Affiche l'historique des couches (layers) de l'image nginx.",
          rule: { prefixes: [["docker", "history"], ["docker", "image", "history"]], args: ["nginx"] },
          solution: "docker history nginx",
          hint: "Le mot anglais pour « historique »",
          output: `IMAGE          CREATED       CREATED BY                                      SIZE
39286ab8a5e1   2 weeks ago   CMD ["nginx" "-g" "daemon off;"]                0B
<missing>      2 weeks ago   EXPOSE map[80/tcp:{}]                           0B
<missing>      2 weeks ago   COPY 30-tune-worker-processes.sh /docker-ent…   4.62kB
<missing>      2 weeks ago   RUN /bin/sh -c set -x && groupadd --system …    112MB`,
        },
      ],
    },
    {
      id: "supprimer-images",
      kind: "command",
      title: "Supprimer des images",
      intro:
        "Les images prennent de la place. `docker rmi` (ou `docker image rm`) supprime une image ; `docker image prune` supprime les images « pendantes » (sans tag).",
      steps: [
        {
          instruction: "Supprime l'image hello-world.",
          rule: { prefixes: [["docker", "rmi"], ["docker", "image", "rm"]], args: ["hello-world"] },
          solution: "docker rmi hello-world",
          hint: "rm + i (pour image)",
          output: `Untagged: hello-world:latest
Deleted: sha256:d2c94e258dcb3c5ac2798d32e1249e42ef01cba4841c2234249495f87264ac5a`,
        },
        {
          instruction: "Supprime toutes les images inutilisées (pas seulement les pendantes), sans demande de confirmation.",
          rule: {
            prefixes: [["docker", "image", "prune"]],
            flags: [{ names: ["-a", "--all"] }, { names: ["-f", "--force"] }],
          },
          solution: "docker image prune -a -f",
          hint: "docker image prune avec les options « all » et « force »",
          output: `Deleted Images:
untagged: node:22-alpine
deleted: sha256:dbcd2d5da5a1…

Total reclaimed space: 157MB`,
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Quel tag est utilisé par défaut avec `docker pull nginx` ?",
      choices: ["stable", "default", "latest", "main"],
      answer: 2,
      explanation: "Sans tag explicite, Docker utilise le tag `latest`.",
    },
    {
      question: "Quelle commande liste les images locales ?",
      choices: ["docker ps", "docker images", "docker list", "docker pull --list"],
      answer: 1,
      explanation: "`docker images` ou `docker image ls`. `docker ps` liste les conteneurs.",
    },
    {
      question: "Que fait `docker tag nginx moncompte/nginx:v1` ?",
      choices: [
        "Copie physiquement l'image (double l'espace disque)",
        "Publie l'image sur Docker Hub",
        "Crée un nouveau nom pointant vers la même image",
        "Renomme l'image et supprime l'ancien nom",
      ],
      answer: 2,
      explanation: "Un tag est un simple alias : les deux noms partagent le même IMAGE ID.",
    },
    {
      question: "Pourquoi `docker rmi nginx` peut-il échouer ?",
      choices: [
        "Parce qu'un conteneur (même arrêté) utilise encore cette image",
        "Parce qu'il faut être connecté à Docker Hub",
        "Parce que nginx est une image officielle",
        "Ça n'échoue jamais",
      ],
      answer: 0,
      explanation: "Il faut d'abord supprimer les conteneurs qui dépendent de l'image (ou forcer avec -f).",
    },
    {
      question: "Qu'est-ce qu'une image « pendante » (dangling) ?",
      choices: [
        "Une image en cours de téléchargement",
        "Une image sans tag, souvent issue d'un ancien build",
        "Une image corrompue",
        "Une image publique",
      ],
      answer: 1,
      explanation: "Elles apparaissent comme `<none>:<none>` et sont nettoyées par `docker image prune`.",
    },
    {
      question: "Que signifie `alpine` dans `node:22-alpine` ?",
      choices: [
        "Une version bêta de Node",
        "Une image basée sur Alpine Linux, très légère",
        "Une image réservée à macOS",
        "Le nom de l'auteur",
      ],
      answer: 1,
      explanation: "Alpine est une distribution Linux minimaliste (~5 Mo) : les images sont beaucoup plus petites.",
    },
  ],
};

import type { Module } from "../types";

export const images: Module = {
  id: "images",
  title: "Les images",
  description: "Télécharger, lister, inspecter, taguer et supprimer des images.",
  icon: "layers",
  videos: [
    { youtubeId: "Lu7klFVxvnY", title: "Images : tags, pull et push", author: "xavki", duration: "12:10", lang: "fr" },
    {
      youtubeId: "pg19Z8LL06w",
      title: "Docker Crash Course for Absolute Beginners",
      author: "TechWorld with Nana",
      duration: "1:07:39",
      lang: "en",
    },
  ],
  resources: [
    {
      title: "Qu'est-ce qu'une image ?",
      url: "https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/",
      kind: "doc",
      lang: "en",
      description: "Couches, immutabilité et cycle de vie d'une image.",
    },
    {
      title: "Référence docker image",
      url: "https://docs.docker.com/reference/cli/docker/image/",
      kind: "doc",
      lang: "en",
      description: "Toutes les sous-commandes de gestion des images et leurs options.",
    },
    {
      title: "Images officielles sur Docker Hub",
      url: "https://hub.docker.com/search?badges=official",
      kind: "article",
      lang: "en",
      description: "Le catalogue des Docker Official Images à privilégier.",
    },
    {
      title: "Training Play with Docker",
      url: "https://training.play-with-docker.com/",
      kind: "lab",
      lang: "en",
      description: "Parcours de labs guidés, du débutant à l'avancé, directement dans le navigateur.",
    },
  ],
  exercises: [
    {
      id: "pull-et-lister",
      kind: "command",
      setup: { images: ["hello-world"] },
      title: "Télécharger et lister",
      intro:
        "Une image se compose d'un nom et d'un tag (`nginx:1.27`). Sans tag, Docker utilise `latest`. `docker pull` télécharge une image sans la lancer.",
      steps: [
        {
          instruction: "Télécharge l'image nginx (sans préciser de tag).",
          rule: {
            prefixes: [
              ["docker", "pull"],
              ["docker", "image", "pull"],
            ],
            args: ["nginx"],
          },
          solution: "docker pull nginx",
          hint: "docker pull <image>",
        },
        {
          instruction: "Télécharge l'image node en version 22-alpine (tag 22-alpine).",
          rule: {
            prefixes: [
              ["docker", "pull"],
              ["docker", "image", "pull"],
            ],
            args: ["node:22-alpine"],
          },
          solution: "docker pull node:22-alpine",
          hint: "Le tag se place après le nom, séparé par « : »",
        },
        {
          instruction: "Liste toutes les images présentes localement.",
          rule: {
            prefixes: [
              ["docker", "images"],
              ["docker", "image", "ls"],
              ["docker", "image", "list"],
            ],
          },
          solution: "docker images",
          hint: "Le pluriel de « image »… ou docker image ls",
        },
      ],
    },
    {
      id: "inspecter-taguer",
      kind: "command",
      setup: { images: ["nginx"] },
      title: "Inspecter et taguer",
      intro:
        "`docker image inspect` affiche les métadonnées JSON d'une image. `docker tag` crée un nouveau nom (alias) pointant vers la même image — indispensable avant de publier sur Docker Hub.",
      steps: [
        {
          instruction: "Inspecte l'image nginx.",
          rule: {
            prefixes: [
              ["docker", "image", "inspect"],
              ["docker", "inspect"],
            ],
            args: ["nginx"],
          },
          solution: "docker image inspect nginx",
          hint: "docker image inspect <image>",
        },
        {
          instruction: "Crée un tag mon-nginx:v1 à partir de l'image nginx.",
          rule: {
            prefixes: [
              ["docker", "tag"],
              ["docker", "image", "tag"],
            ],
            args: ["nginx", "mon-nginx:v1"],
          },
          solution: "docker tag nginx mon-nginx:v1",
          hint: "docker tag <source> <cible>",
        },
        {
          instruction: "Affiche l'historique des couches (layers) de l'image nginx.",
          rule: {
            prefixes: [
              ["docker", "history"],
              ["docker", "image", "history"],
            ],
            args: ["nginx"],
          },
          solution: "docker history nginx",
          hint: "Le mot anglais pour « historique »",
        },
      ],
    },
    {
      id: "supprimer-images",
      kind: "command",
      setup: { images: ["hello-world", "nginx", "node:22-alpine"], danglingImages: 2 },
      title: "Supprimer des images",
      intro:
        "Les images prennent de la place. `docker rmi` (ou `docker image rm`) supprime une image ; `docker image prune` supprime les images « pendantes » (sans tag).",
      steps: [
        {
          instruction: "Supprime l'image hello-world.",
          rule: {
            prefixes: [
              ["docker", "rmi"],
              ["docker", "image", "rm"],
            ],
            args: ["hello-world"],
          },
          solution: "docker rmi hello-world",
          hint: "rm + i (pour image)",
        },
        {
          instruction: "Supprime toutes les images inutilisées (pas seulement les pendantes), sans demande de confirmation.",
          rule: {
            prefixes: [["docker", "image", "prune"]],
            flags: [{ names: ["-a", "--all"] }, { names: ["-f", "--force"] }],
          },
          solution: "docker image prune -a -f",
          hint: "docker image prune avec les options « all » et « force »",
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

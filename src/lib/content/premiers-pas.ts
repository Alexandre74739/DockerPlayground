import type { Module } from "../types";

export const premiersPas: Module = {
  id: "premiers-pas",
  title: "Premiers pas",
  description: "Vérifier son installation et lancer son tout premier conteneur.",
  icon: "🚀",
  exercises: [
    {
      id: "verifier-installation",
      kind: "command",
      title: "Vérifier l'installation",
      intro:
        "Avant tout, on s'assure que Docker est bien installé et que le moteur (Docker Engine, lancé par Docker Desktop) répond.",
      steps: [
        {
          instruction: "Affiche la version de Docker installée.",
          rule: { prefixes: [["docker", "--version"], ["docker", "-v"], ["docker", "version"]] },
          solution: "docker --version",
          hint: "La plupart des outils CLI acceptent l'option --version.",
          output: "Docker version 27.3.1, build ce12230",
        },
        {
          instruction: "Affiche les informations détaillées du moteur Docker (nombre de conteneurs, images, OS…).",
          rule: { prefixes: [["docker", "info"], ["docker", "system", "info"]] },
          solution: "docker info",
          hint: "Le mot anglais pour « informations »…",
          output: `Client:
 Version:    27.3.1
 Context:    desktop-linux

Server:
 Containers: 0
  Running: 0
  Paused: 0
  Stopped: 0
 Images: 0
 Server Version: 27.3.1
 Operating System: Docker Desktop
 CPUs: 8
 Total Memory: 7.6GiB`,
        },
      ],
    },
    {
      id: "hello-world",
      kind: "command",
      title: "Hello World",
      intro:
        "`docker run` crée et démarre un conteneur à partir d'une image. Si l'image n'existe pas en local, Docker la télécharge automatiquement depuis Docker Hub.",
      steps: [
        {
          instruction: "Lance un conteneur à partir de l'image hello-world.",
          rule: { prefixes: [["docker", "run"], ["docker", "container", "run"]], args: ["hello-world"] },
          solution: "docker run hello-world",
          hint: "docker run <image>",
          output: `Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
c1ec31eb5944: Pull complete
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.`,
        },
      ],
    },
    {
      id: "obtenir-aide",
      kind: "command",
      title: "Obtenir de l'aide",
      intro:
        "Toutes les commandes Docker possèdent une aide intégrée. C'est le meilleur réflexe pour être autonome : `docker <commande> --help`.",
      steps: [
        {
          instruction: "Affiche l'aide générale de Docker.",
          rule: { prefixes: [["docker", "--help"], ["docker", "help"]] },
          solution: "docker --help",
          hint: "Option universelle : --help",
          output: `Usage:  docker [OPTIONS] COMMAND

A self-sufficient runtime for containers

Common Commands:
  run         Create and run a new container from an image
  exec        Execute a command in a running container
  ps          List containers
  build       Build an image from a Dockerfile
  pull        Download an image from a registry
  push        Upload an image to a registry
  images      List images
  login       Authenticate to a registry
  ...`,
        },
        {
          instruction: "Affiche maintenant l'aide spécifique à la commande run.",
          rule: { prefixes: [["docker", "run", "--help"], ["docker", "help", "run"]] },
          solution: "docker run --help",
          hint: "docker <commande> --help",
          output: `Usage:  docker run [OPTIONS] IMAGE [COMMAND] [ARG...]

Create and run a new container from an image

Options:
  -d, --detach         Run container in background and print container ID
  -e, --env list       Set environment variables
  -i, --interactive    Keep STDIN open even if not attached
      --name string    Assign a name to the container
  -p, --publish list   Publish a container's port(s) to the host
      --rm             Automatically remove the container when it exits
  -t, --tty            Allocate a pseudo-TTY
  -v, --volume list    Bind mount a volume`,
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Que fait `docker run hello-world` si l'image n'est pas présente localement ?",
      choices: [
        "Elle renvoie une erreur",
        "Elle télécharge l'image depuis Docker Hub puis lance le conteneur",
        "Elle construit l'image à partir d'un Dockerfile",
        "Elle demande de se connecter à Docker Hub",
      ],
      answer: 1,
      explanation: "Docker fait automatiquement un `pull` depuis le registre par défaut (Docker Hub) si l'image est absente.",
    },
    {
      question: "Quelle est la différence entre une image et un conteneur ?",
      choices: [
        "Aucune, ce sont des synonymes",
        "Une image est un conteneur arrêté",
        "Une image est un modèle en lecture seule ; un conteneur est une instance en cours d'exécution de cette image",
        "Un conteneur est un fichier sur Docker Hub",
      ],
      answer: 2,
      explanation: "L'image est le « moule », le conteneur est l'objet créé à partir de ce moule. On peut lancer plusieurs conteneurs depuis une même image.",
    },
    {
      question: "Quelle commande affiche le nombre de conteneurs et d'images présents sur la machine ?",
      choices: ["docker info", "docker status", "docker list", "docker count"],
      answer: 0,
      explanation: "`docker info` affiche un résumé complet du moteur Docker.",
    },
    {
      question: "Quel est le rôle de Docker Desktop ?",
      choices: [
        "C'est un registre d'images en ligne",
        "C'est une application qui installe et fait tourner le moteur Docker, avec une interface graphique",
        "C'est un langage de programmation",
        "C'est un remplaçant du Dockerfile",
      ],
      answer: 1,
      explanation: "Docker Desktop embarque Docker Engine, la CLI, Docker Compose et une interface graphique pour gérer conteneurs, images et volumes.",
    },
    {
      question: "Comment obtenir la liste des options de `docker build` ?",
      choices: ["docker build --options", "man docker", "docker build --help", "docker help --build"],
      answer: 2,
      explanation: "`--help` fonctionne après n'importe quelle sous-commande.",
    },
  ],
};

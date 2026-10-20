import type { Module } from "../types";

export const premiersPas: Module = {
  id: "premiers-pas",
  title: "Premiers pas",
  description: "Vérifier son installation et lancer son tout premier conteneur.",
  icon: "rocket",
  videos: [
    { youtubeId: "mspEJzb8LC4", title: "Docker expliqué en 5 minutes", author: "Bande de Codeurs", duration: "8:04", lang: "fr" },
    { youtubeId: "SXB6KJ4u5vg", title: "Débuter de zéro avec Docker en français (1/3)", author: "cocadmin", duration: "5:51", lang: "fr" },
    { youtubeId: "Gjnup-PuquQ", title: "Docker in 100 Seconds", author: "Fireship", duration: "2:07", lang: "en" },
  ],
  resources: [
    {
      title: "Qu'est-ce qu'un conteneur ?",
      url: "https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/",
      kind: "doc",
      lang: "en",
      description: "La notion de conteneur expliquée par la documentation officielle, avec un essai guidé.",
    },
    {
      title: "Vue d'ensemble de Docker",
      url: "https://docs.docker.com/get-started/docker-overview/",
      kind: "doc",
      lang: "en",
      description: "Architecture client / démon / registre et vocabulaire de base.",
    },
    {
      title: "Docker Desktop",
      url: "https://docs.docker.com/desktop/",
      kind: "doc",
      lang: "en",
      description: "Installation, paramètres et fonctionnalités de Docker Desktop.",
    },
    {
      title: "Play with Docker",
      url: "https://labs.play-with-docker.com/",
      kind: "lab",
      lang: "en",
      description: "Un vrai Docker dans le navigateur, gratuit (compte Docker requis), sessions de 4 h.",
    },
  ],
  exercises: [
    {
      id: "verifier-installation",
      kind: "command",
      title: "Vérifier l'installation",
      intro: "Avant tout, on s'assure que Docker est bien installé et que le moteur (Docker Engine, lancé par Docker Desktop) répond.",
      steps: [
        {
          instruction: "Affiche la version de Docker installée.",
          rule: {
            prefixes: [
              ["docker", "--version"],
              ["docker", "-v"],
              ["docker", "version"],
            ],
          },
          solution: "docker --version",
          hint: "La plupart des outils CLI acceptent l'option --version.",
        },
        {
          instruction: "Affiche les informations détaillées du moteur Docker (nombre de conteneurs, images, OS…).",
          rule: {
            prefixes: [
              ["docker", "info"],
              ["docker", "system", "info"],
            ],
          },
          solution: "docker info",
          hint: "Le mot anglais pour « informations »…",
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
          rule: {
            prefixes: [
              ["docker", "run"],
              ["docker", "container", "run"],
            ],
            args: ["hello-world"],
          },
          solution: "docker run hello-world",
          hint: "docker run <image>",
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
          rule: {
            prefixes: [
              ["docker", "--help"],
              ["docker", "help"],
            ],
          },
          solution: "docker --help",
          hint: "Option universelle : --help",
        },
        {
          instruction: "Affiche maintenant l'aide spécifique à la commande run.",
          rule: {
            prefixes: [
              ["docker", "run", "--help"],
              ["docker", "help", "run"],
            ],
          },
          solution: "docker run --help",
          hint: "docker <commande> --help",
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
      explanation:
        "L'image est le « moule », le conteneur est l'objet créé à partir de ce moule. On peut lancer plusieurs conteneurs depuis une même image.",
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
      explanation:
        "Docker Desktop embarque Docker Engine, la CLI, Docker Compose et une interface graphique pour gérer conteneurs, images et volumes.",
    },
    {
      question: "Comment obtenir la liste des options de `docker build` ?",
      choices: ["docker build --options", "man docker", "docker build --help", "docker help --build"],
      answer: 2,
      explanation: "`--help` fonctionne après n'importe quelle sous-commande.",
    },
  ],
};

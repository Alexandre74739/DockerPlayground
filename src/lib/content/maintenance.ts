import type { Module } from "../types";

export const maintenance: Module = {
  id: "maintenance",
  title: "Nettoyage & Docker Desktop",
  description: "Libérer de l'espace, surveiller et retrouver ses repères dans Docker Desktop.",
  icon: "brush",
  videos: [
    { youtubeId: "eTjglugM2Bo", title: "Astuce : prune", author: "xavki", duration: "7:02", lang: "fr" },
    {
      youtubeId: "CdbAqjjNj2o",
      title: "Docker Desktop & WSL2 : installation, configuration et premier conteneur",
      author: "Tchaps Tech",
      duration: "25:56",
      lang: "fr",
    },
  ],
  resources: [
    {
      title: "Nettoyer les objets inutilisés",
      url: "https://docs.docker.com/engine/manage-resources/pruning/",
      kind: "doc",
      lang: "en",
      description: "Tout sur les commandes prune et leurs filtres.",
    },
    {
      title: "Contextes Docker",
      url: "https://docs.docker.com/engine/manage-resources/contexts/",
      kind: "doc",
      lang: "en",
      description: "Piloter plusieurs moteurs Docker depuis la même CLI.",
    },
    {
      title: "Explorer Docker Desktop",
      url: "https://docs.docker.com/desktop/use-desktop/",
      kind: "doc",
      lang: "en",
      description: "Conteneurs, images, volumes et paramètres dans l'interface.",
    },
    {
      title: "Roadmap Docker",
      url: "https://roadmap.sh/docker",
      kind: "article",
      lang: "en",
      description: "Une carte pour savoir quoi apprendre ensuite.",
    },
    {
      title: "Docker Labs (Collabnix)",
      url: "https://dockerlabs.collabnix.com/",
      kind: "lab",
      lang: "en",
      description: "Des centaines de tutoriels et labs communautaires gratuits.",
    },
  ],
  exercises: [
    {
      id: "espace-disque",
      kind: "command",
      setup: {
        images: ["hello-world", "nginx", "node:22-alpine", "postgres", "redis", "ubuntu"],
        danglingImages: 3,
        containers: [
          { name: "web", image: "nginx", ports: ["8080:80"] },
          { name: "eager_turing", image: "hello-world", status: "exited" },
          { name: "old_api", image: "node:22-alpine", status: "exited" },
        ],
        volumes: ["pgdata", "old_data", "cache_data"],
        buildCache: 890_000_000,
      },
      title: "Faire le ménage",
      intro: "Images, conteneurs arrêtés, volumes et cache de build s'accumulent vite. Docker fournit des commandes `prune` pour nettoyer.",
      steps: [
        {
          instruction: "Affiche l'espace disque utilisé par Docker.",
          rule: { prefixes: [["docker", "system", "df"]] },
          solution: "docker system df",
          hint: "df = disk free (comme sous Linux)",
        },
        {
          instruction: "Supprime tous les conteneurs arrêtés.",
          rule: { prefixes: [["docker", "container", "prune"]] },
          solution: "docker container prune",
          hint: "docker container prune",
        },
        {
          instruction: "Supprime tous les volumes non utilisés, y compris les volumes nommés.",
          rule: { prefixes: [["docker", "volume", "prune"]], flags: [{ names: ["-a", "--all"] }] },
          solution: "docker volume prune -a",
          hint: "Sans option, volume prune ne supprime que les volumes anonymes. Ajoute l'option « all ».",
        },
        {
          instruction: "Grand ménage : supprime tout ce qui est inutilisé, y compris toutes les images non utilisées.",
          rule: { prefixes: [["docker", "system", "prune"]], flags: [{ names: ["-a", "--all"] }] },
          solution: "docker system prune -a",
          hint: "docker system prune avec l'option all",
        },
      ],
    },
    {
      id: "contextes-desktop",
      kind: "command",
      setup: {
        context: "default",
        containers: [{ name: "web", image: "nginx", ports: ["8080:80"] }],
      },
      title: "Contextes et diagnostic",
      intro:
        "Un contexte indique à la CLI quel moteur Docker piloter. Docker Desktop crée le contexte `desktop-linux`. Utile si Docker « ne répond pas » : vérifie le contexte actif.",
      steps: [
        {
          instruction: "Liste les contextes Docker.",
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
          instruction: "Le contexte actif n'est pas celui de Docker Desktop : bascule sur desktop-linux.",
          rule: { prefixes: [["docker", "context", "use"]], args: ["desktop-linux"] },
          solution: "docker context use desktop-linux",
          hint: "docker context use <nom>",
        },
        {
          instruction: "Affiche les processus qui tournent dans le conteneur web.",
          rule: {
            prefixes: [
              ["docker", "top"],
              ["docker", "container", "top"],
            ],
            args: ["web"],
          },
          solution: "docker top web",
          hint: "Comme la commande Linux top",
        },
        {
          instruction: "Copie le fichier /etc/nginx/nginx.conf du conteneur web vers le dossier courant.",
          rule: {
            prefixes: [
              ["docker", "cp"],
              ["docker", "container", "cp"],
            ],
            args: ["web:/etc/nginx/nginx.conf", "."],
          },
          solution: "docker cp web:/etc/nginx/nginx.conf .",
          hint: "docker cp <conteneur>:<chemin> <destination>",
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

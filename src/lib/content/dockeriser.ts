import type { Module } from "../types";
import { FLASK_DOCKERFILE, FLASK_FILES, PROJECT_FILES } from "./fixtures";

const run = [
  ["docker", "run"],
  ["docker", "container", "run"],
];

export const dockeriser: Module = {
  id: "dockeriser",
  title: "Dockeriser une application",
  description: "La méthode pour conteneuriser n'importe quel projet Node.js ou Python.",
  icon: "package",
  videos: [
    { youtubeId: "0v3JXxuyF7Y", title: "Comment dockeriser une app ?", author: "Korben", duration: "28:40", lang: "fr" },
    { youtubeId: "MIxyr43FmIU", title: "Conteneuriser une application avec Docker", author: "inpulse tv", duration: "15:05", lang: "fr" },
    { youtubeId: "bi0cKgmRuiA", title: "How To Containerize Python Applications", author: "Patrick Loeber", duration: "22:17", lang: "en" },
    { youtubeId: "W8yZUCzy4SI", title: "Docker Init Explained", author: "KodeKloud", duration: "9:43", lang: "en" },
  ],
  resources: [
    {
      title: "Guide Node.js",
      url: "https://docs.docker.com/guides/nodejs/",
      kind: "doc",
      lang: "en",
      description: "Conteneuriser, développer et tester une application Node.js, étape par étape.",
    },
    {
      title: "Guide Python",
      url: "https://docs.docker.com/guides/python/",
      kind: "doc",
      lang: "en",
      description: "Le même parcours pour une application Python.",
    },
    {
      title: "docker init",
      url: "https://docs.docker.com/reference/cli/docker/init/",
      kind: "doc",
      lang: "en",
      description: "Générer Dockerfile, compose.yaml et .dockerignore adaptés au projet.",
    },
    {
      title: "Atelier : conteneuriser une application",
      url: "https://docs.docker.com/get-started/workshop/02_our_app/",
      kind: "lab",
      lang: "en",
      description: "Atelier officiel guidé, sur une application de liste de tâches.",
    },
  ],
  exercises: [
    {
      id: "dockerfile-python",
      kind: "file",
      title: "Dockerfile d'une API Flask",
      intro:
        "La méthode est toujours la même : partir d'une image officielle adaptée au langage, installer les dépendances **avant** de copier le code (pour le cache), documenter le port, puis définir la commande de démarrage.",
      fileName: "Dockerfile",
      instruction:
        "L'application Flask écoute sur le port 8000 et ses dépendances sont dans requirements.txt. Écris son Dockerfile à partir de python:3.12-slim : dossier /app, installation des dépendances avec pip (sans cache), copie du code, port 8000 et lancement avec python app.py.",
      starter: "# Image de base Python, variante légère\n",
      checks: [
        { pattern: /^FROM\s+python:3\.12-slim\s*$/im, label: "FROM python:3.12-slim" },
        { pattern: /^WORKDIR\s+\/app\s*$/im, label: "WORKDIR /app" },
        { pattern: /^COPY\s+requirements\.txt\s+(\.\/?|\/app\/?)\s*$/im, label: "COPY requirements.txt ." },
        {
          pattern: /^RUN\s+pip\s+install\s+(--no-cache-dir\s+-r|-r\s+requirements\.txt\s+--no-cache-dir)/im,
          label: "RUN pip install --no-cache-dir -r requirements.txt",
        },
        { pattern: /^COPY\s+\.\s+(\.\/?|\/app\/?)\s*$/im, label: "COPY . ." },
        { pattern: /^EXPOSE\s+8000\s*$/im, label: "EXPOSE 8000" },
        { pattern: /^CMD\s+(\[\s*"python3?"\s*,\s*"app\.py"\s*\]|python3?\s+app\.py)\s*$/im, label: 'CMD ["python", "app.py"]' },
        { pattern: /COPY\s+\.\s+\.[\s\S]*RUN\s+pip/i, label: "Dépendances installées avant la copie du code", absent: true },
      ],
      solution: FLASK_DOCKERFILE,
    },
    {
      id: "construire-et-tester",
      kind: "command",
      title: "Construire, lancer, vérifier",
      intro:
        "Une application est dockerisée quand on peut la construire, la lancer et l'interroger. Le Dockerfile du projet Flask est prêt dans `~/projet` : à toi de le valider de bout en bout.",
      setup: { files: { ...FLASK_FILES, Dockerfile: FLASK_DOCKERFILE }, app: { port: 8000, response: "Hello depuis Flask" } },
      steps: [
        {
          instruction: "Affiche le Dockerfile du projet pour le relire.",
          rule: { prefixes: [["cat", "Dockerfile"]] },
          solution: "cat Dockerfile",
          hint: "La commande cat affiche un fichier.",
        },
        {
          instruction: "Construis l'image flask-app à partir du dossier courant.",
          rule: {
            prefixes: [
              ["docker", "build"],
              ["docker", "buildx", "build"],
            ],
            flags: [{ names: ["-t", "--tag"], value: "flask-app" }],
            args: ["."],
          },
          solution: "docker build -t flask-app .",
          hint: "docker build -t <nom> <contexte>",
        },
        {
          instruction: "Lance-la en arrière-plan sous le nom flask, en publiant le port 8000.",
          rule: {
            prefixes: run,
            flags: [
              { names: ["-d", "--detach"] },
              { names: ["-p", "--publish"], value: "8000:8000" },
              { names: ["--name"], value: "flask" },
            ],
            args: ["flask-app"],
          },
          solution: "docker run -d -p 8000:8000 --name flask flask-app",
          hint: "L'application écoute sur 8000 dans le conteneur.",
        },
        {
          instruction: "Vérifie que l'application répond sur http://localhost:8000.",
          rule: {
            prefixes: [
              ["curl", "localhost:8000"],
              ["curl", "http://localhost:8000"],
              ["curl", "localhost:8000/"],
              ["curl", "http://localhost:8000/"],
            ],
          },
          solution: "curl localhost:8000",
          hint: "curl <adresse>",
        },
        {
          instruction: "Consulte les journaux du conteneur.",
          rule: {
            prefixes: [
              ["docker", "logs"],
              ["docker", "container", "logs"],
            ],
            args: ["flask"],
          },
          solution: "docker logs flask",
          hint: "docker logs <nom>",
        },
      ],
    },
    {
      id: "docker-init",
      kind: "command",
      title: "Démarrer vite avec docker init",
      intro:
        "`docker init` pose quelques questions puis génère un Dockerfile, un compose.yaml et un .dockerignore qui suivent les bonnes pratiques. Appuie sur Entrée pour accepter la valeur proposée entre parenthèses.",
      setup: {
        files: {
          "package.json": PROJECT_FILES["package.json"],
          "package-lock.json": PROJECT_FILES["package-lock.json"],
          "server.js": PROJECT_FILES["server.js"],
        },
      },
      steps: [
        {
          instruction: "Lance l'assistant docker init et réponds à ses questions (Node, valeurs par défaut).",
          rule: { prefixes: [["docker", "init"]] },
          solution: "docker init",
          hint: "Entrée valide la valeur proposée.",
        },
        {
          instruction: "Liste les fichiers du projet pour voir ce qui a été créé (y compris les fichiers cachés).",
          rule: { prefixes: [["ls"]], flags: [{ names: ["-a"] }] },
          solution: "ls -a",
          hint: "ls avec l'option -a",
        },
        {
          instruction: "Relis le Dockerfile généré.",
          rule: { prefixes: [["cat", "Dockerfile"]] },
          solution: "cat Dockerfile",
          hint: "cat Dockerfile",
        },
        {
          instruction: "Démarre l'application avec Compose en reconstruisant l'image, en arrière-plan.",
          rule: { prefixes: [["docker", "compose", "up"]], flags: [{ names: ["-d", "--detach"] }, { names: ["--build"] }] },
          solution: "docker compose up -d --build",
          hint: "docker compose up avec -d et --build",
        },
        {
          instruction: "Vérifie que l'application répond sur le port 3000.",
          rule: {
            prefixes: [
              ["curl", "localhost:3000"],
              ["curl", "http://localhost:3000"],
              ["curl", "localhost:3000/"],
              ["curl", "http://localhost:3000/"],
            ],
          },
          solution: "curl localhost:3000",
          hint: "curl localhost:<port>",
        },
      ],
    },
    {
      id: "dockerignore-python",
      kind: "file",
      title: "Le .dockerignore d'un projet Python",
      intro:
        "Un projet Python traîne souvent un environnement virtuel (`.venv`), des caches (`__pycache__`, `*.pyc`), des notebooks et des jeux de données volumineux. Rien de tout cela ne doit partir dans l'image.",
      fileName: ".dockerignore",
      instruction:
        "Exclus .venv, __pycache__ (à tous les niveaux), les fichiers *.pyc, .pytest_cache, .env, le dossier notebooks et tout le dossier data… SAUF le fichier data/reference.csv dont l'application a besoin.",
      starter: "",
      checks: [
        { pattern: /^\/?\.venv\/?\s*$/m, label: ".venv" },
        { pattern: /^\*\*\/__pycache__\/?\s*$/m, label: "**/__pycache__" },
        { pattern: /^(\*\*\/)?\*\.pyc\s*$/m, label: "*.pyc" },
        { pattern: /^\/?\.pytest_cache\/?\s*$/m, label: ".pytest_cache" },
        { pattern: /^\.env\s*$/m, label: ".env" },
        { pattern: /^\/?notebooks\/?\s*$/m, label: "notebooks" },
        { pattern: /^\/?data\/?(\*\*?)?\s*$/m, label: "data (tout le dossier)" },
        { pattern: /^!data\/reference\.csv\s*$/m, label: "!data/reference.csv" },
        {
          pattern: /^!data\/reference\.csv[\s\S]*^\/?data\/?(\*\*?)?\s*$/m,
          label: "L'exception vient après l'exclusion de data",
          absent: true,
        },
      ],
      solution: `.venv
**/__pycache__
*.pyc
.pytest_cache
.env
notebooks

# Données : on n'embarque que le référentiel
data/*
!data/reference.csv
`,
    },
  ],
  quiz: [
    {
      question: "Pourquoi copier `requirements.txt` (ou `package.json`) avant le reste du code ?",
      choices: [
        "C'est imposé par Docker",
        "Pour que l'installation des dépendances reste en cache tant qu'elles ne changent pas",
        "Pour réduire la taille de l'image",
        "Pour que le code soit en lecture seule",
      ],
      answer: 1,
      explanation:
        "Modifier une ligne de code ne relance alors pas l'installation des dépendances : les builds passent de minutes à secondes.",
    },
    {
      question: "Ton application écoute sur `127.0.0.1:8000` dans le conteneur. Que se passe-t-il avec `-p 8000:8000` ?",
      choices: [
        "Tout fonctionne",
        "La connexion échoue : il faut écouter sur 0.0.0.0 pour être joignable depuis l'extérieur du conteneur",
        "Docker corrige automatiquement l'adresse",
        "Le port est refusé au build",
      ],
      answer: 1,
      explanation: "127.0.0.1 désigne le conteneur lui-même. Une application conteneurisée doit écouter sur 0.0.0.0.",
    },
    {
      question: "Quelle image de base choisir par défaut pour une API Python ?",
      choices: ["ubuntu:latest, puis installer Python", "python:3.12-slim", "alpine puis compiler Python", "n'importe laquelle"],
      answer: 1,
      explanation: "Une image officielle du langage, en variante slim ou alpine : légère, maintenue et déjà configurée.",
    },
    {
      question: "Que génère `docker init` ?",
      choices: [
        "Une image prête à publier",
        "Un Dockerfile, un compose.yaml, un .dockerignore et un README.Docker.md adaptés au projet",
        "Un compte Docker Hub",
        "Un conteneur de démonstration",
      ],
      answer: 1,
      explanation:
        "Les fichiers suivent les bonnes pratiques (utilisateur non root, cache…) et sont un excellent point de départ à adapter.",
    },
    {
      question: "Pourquoi utiliser `pip install --no-cache-dir` dans un Dockerfile ?",
      choices: [
        "Pour installer plus vite",
        "Pour ne pas conserver le cache de pip dans l'image et la garder légère",
        "C'est obligatoire avec Python 3.12",
        "Pour éviter les erreurs réseau",
      ],
      answer: 1,
      explanation: "Le cache est inutile une fois les paquets installés : il ne ferait qu'alourdir la couche.",
    },
  ],
};

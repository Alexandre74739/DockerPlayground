import type { Module } from "../types";

const build = [["docker", "build"], ["docker", "image", "build"], ["docker", "buildx", "build"]];

export const dockerfile: Module = {
  id: "dockerfile",
  title: "Dockerfile & build",
  description: "Écrire un Dockerfile et construire ses propres images.",
  icon: "🛠️",
  exercises: [
    {
      id: "premier-dockerfile",
      kind: "file",
      title: "Écrire un Dockerfile Node.js",
      intro:
        "Un Dockerfile est une recette : chaque instruction crée une couche de l'image. Instructions clés : FROM (image de base), WORKDIR (dossier de travail), COPY (copier des fichiers), RUN (exécuter pendant le build), EXPOSE (documenter un port), CMD (commande au démarrage).",
      fileName: "Dockerfile",
      instruction:
        "Écris un Dockerfile pour une app Node.js : base node:22-alpine, dossier /app, copie de package*.json, npm install, copie du reste du code, port 3000 et démarrage avec node server.js.",
      starter: `# Image de base
FROM

# Dossier de travail dans le conteneur

`,
      checks: [
        { pattern: /^FROM\s+node:22-alpine\s*$/im, label: "FROM node:22-alpine" },
        { pattern: /^WORKDIR\s+\/app\s*$/im, label: "WORKDIR /app" },
        { pattern: /^COPY\s+package\*?\.json\s+(\.\/?|\/app\/?)\s*$/im, label: "COPY package*.json ./" },
        { pattern: /^RUN\s+npm\s+(install|i|ci)\b/im, label: "RUN npm install" },
        { pattern: /^COPY\s+\.\s+(\.\/?|\/app\/?)\s*$/im, label: "COPY . ." },
        { pattern: /^EXPOSE\s+3000\s*$/im, label: "EXPOSE 3000" },
        { pattern: /^CMD\s+(\[\s*"node"\s*,\s*"server\.js"\s*\]|node\s+server\.js)\s*$/im, label: 'CMD ["node", "server.js"]' },
      ],
      solution: `FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]`,
    },
    {
      id: "construire-image",
      kind: "command",
      title: "Construire une image",
      intro:
        "`docker build` lit le Dockerfile et construit l'image. `-t` lui donne un nom, et le dernier argument (souvent `.`) est le contexte de build : le dossier envoyé au moteur Docker.",
      steps: [
        {
          instruction: "Construis une image nommée mon-app à partir du dossier courant.",
          rule: { prefixes: build, flags: [{ names: ["-t", "--tag"], value: "mon-app" }], args: ["."] },
          solution: "docker build -t mon-app .",
          hint: "docker build -t <nom> <contexte>",
          output: `[+] Building 12.4s (10/10) FINISHED
 => [internal] load build definition from Dockerfile
 => [1/5] FROM docker.io/library/node:22-alpine
 => [2/5] WORKDIR /app
 => [3/5] COPY package*.json ./
 => [4/5] RUN npm install
 => [5/5] COPY . .
 => exporting to image
 => => naming to docker.io/library/mon-app:latest`,
        },
        {
          instruction: "Construis la même image avec le tag 1.0 (mon-app:1.0).",
          rule: { prefixes: build, flags: [{ names: ["-t", "--tag"], value: "mon-app:1.0" }], args: ["."] },
          solution: "docker build -t mon-app:1.0 .",
          hint: "nom:tag",
          output: `[+] Building 0.8s (10/10) FINISHED
 => CACHED [2/5] WORKDIR /app
 => CACHED [3/5] COPY package*.json ./
 => CACHED [4/5] RUN npm install
 => => naming to docker.io/library/mon-app:1.0`,
        },
        {
          instruction: "Construis l'image mon-app:prod en utilisant le fichier Dockerfile.prod.",
          rule: {
            prefixes: build,
            flags: [
              { names: ["-t", "--tag"], value: "mon-app:prod" },
              { names: ["-f", "--file"], value: "Dockerfile.prod" },
            ],
            args: ["."],
          },
          solution: "docker build -f Dockerfile.prod -t mon-app:prod .",
          hint: "L'option -f indique le fichier à utiliser",
          output: `[+] Building 14.1s (12/12) FINISHED
 => [internal] load build definition from Dockerfile.prod
 => => naming to docker.io/library/mon-app:prod`,
        },
        {
          instruction: "Lance ton image mon-app en arrière-plan avec le port 3000 publié sur le port 3000.",
          rule: {
            prefixes: [["docker", "run"], ["docker", "container", "run"]],
            flags: [{ names: ["-d", "--detach"] }, { names: ["-p", "--publish"], value: "3000:3000" }],
            args: ["mon-app"],
          },
          solution: "docker run -d -p 3000:3000 mon-app",
          hint: "Même principe qu'avec nginx",
          output: "c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
        },
      ],
    },
    {
      id: "dockerignore",
      kind: "file",
      title: "Le fichier .dockerignore",
      intro:
        "Comme un .gitignore, le .dockerignore exclut des fichiers du contexte de build : builds plus rapides, images plus légères et pas de secrets embarqués par erreur.",
      fileName: ".dockerignore",
      instruction: "Exclus node_modules, le dossier .git, les fichiers .env et les logs (*.log).",
      starter: "",
      checks: [
        { pattern: /^\/?node_modules\/?\s*$/m, label: "node_modules" },
        { pattern: /^\/?\.git\/?\s*$/m, label: ".git" },
        { pattern: /^\.env\*?\s*$/m, label: ".env" },
        { pattern: /^(\*\*\/)?\*\.log\s*$/m, label: "*.log" },
      ],
      solution: `node_modules
.git
.env
*.log`,
    },
    {
      id: "multi-stage",
      kind: "file",
      title: "Build multi-étapes",
      intro:
        "Un build multi-étapes (multi-stage) utilise une première image pour compiler, puis copie uniquement le résultat dans une image finale légère. On nomme une étape avec `AS` et on copie depuis elle avec `COPY --from=`.",
      fileName: "Dockerfile",
      instruction:
        "Complète ce Dockerfile : l'étape finale part de nginx:alpine et copie le dossier /app/dist de l'étape build vers /usr/share/nginx/html.",
      starter: `FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

# Étape finale
`,
      checks: [
        { pattern: /^FROM\s+node:22-alpine\s+AS\s+build\s*$/im, label: "Étape build nommée (AS build)" },
        { pattern: /^FROM\s+nginx:alpine\s*$/im, label: "FROM nginx:alpine" },
        {
          pattern: /^COPY\s+--from=build\s+\/app\/dist\/?\s+\/usr\/share\/nginx\/html\/?\s*$/im,
          label: "COPY --from=build /app/dist /usr/share/nginx/html",
        },
      ],
      solution: `FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

# Étape finale
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html`,
    },
  ],
  quiz: [
    {
      question: "Quelle est la différence entre RUN et CMD ?",
      choices: [
        "Aucune",
        "RUN s'exécute pendant le build ; CMD définit la commande lancée au démarrage du conteneur",
        "CMD s'exécute pendant le build ; RUN au démarrage",
        "RUN est réservé à Linux",
      ],
      answer: 1,
      explanation: "RUN installe/prépare (une couche par RUN). CMD est la commande par défaut du conteneur.",
    },
    {
      question: "Que représente le `.` dans `docker build -t app .` ?",
      choices: ["Le nom de l'image", "Le contexte de build (dossier courant)", "Le tag latest", "Le Dockerfile"],
      answer: 1,
      explanation: "Le contexte est le dossier envoyé au moteur ; le Dockerfile y est cherché par défaut.",
    },
    {
      question: "Pourquoi copier package.json AVANT le reste du code ?",
      choices: [
        "C'est obligatoire",
        "Pour profiter du cache : `npm install` n'est relancé que si les dépendances changent",
        "Pour que l'image soit plus petite",
        "Pour la sécurité",
      ],
      answer: 1,
      explanation: "Docker réutilise les couches en cache tant que les fichiers copiés n'ont pas changé.",
    },
    {
      question: "Que fait l'instruction EXPOSE 3000 ?",
      choices: [
        "Publie automatiquement le port 3000 sur la machine",
        "Documente le port écouté par l'application ; il faut toujours -p pour le publier",
        "Ouvre le pare-feu",
        "Change le port de l'application",
      ],
      answer: 1,
      explanation: "EXPOSE est informatif. La publication réelle se fait avec `-p` au `docker run`.",
    },
    {
      question: "Quel est l'intérêt principal d'un build multi-étapes ?",
      choices: [
        "Construire plusieurs images à la fois",
        "Obtenir une image finale légère sans les outils de compilation",
        "Accélérer Docker Desktop",
        "Publier sur plusieurs registres",
      ],
      answer: 1,
      explanation: "Seuls les artefacts utiles sont copiés dans l'image finale avec `COPY --from=`.",
    },
    {
      question: "Quel fichier permet d'exclure node_modules du contexte de build ?",
      choices: [".gitignore", ".dockerignore", "docker-compose.yml", ".env"],
      answer: 1,
      explanation: "Le .dockerignore est lu par `docker build` pour filtrer le contexte.",
    },
  ],
};

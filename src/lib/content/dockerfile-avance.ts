import type { Module } from "../types";
import { API_SOURCE } from "./fixtures";

const build = [
  ["docker", "build"],
  ["docker", "buildx", "build"],
];

export const dockerfileAvance: Module = {
  id: "dockerfile-avance",
  title: "Dockerfile et .dockerignore avancés",
  description: "Écrire des Dockerfile rapides à reconstruire : ordre des couches, cache, .dockerignore complet, ENTRYPOINT et ARG.",
  icon: "file",
  videos: [
    { youtubeId: "9v5BLxUCr00", title: "Fonctionnement du cache", author: "xavki", duration: "12:45", lang: "fr" },
    { youtubeId: "oxAguWSpI_I", title: "Comprendre les layers / couches", author: "xavki", duration: "6:37", lang: "fr" },
    { youtubeId: "RP-z4dqRTZA", title: "How Dockerfile Layers/Caching Work", author: "Benjamin Porter", duration: "8:21", lang: "en" },
    { youtubeId: "UHWCkDbN0yM", title: "Docker Crash Course #6 — dockerignore", author: "Net Ninja", duration: "3:59", lang: "en" },
  ],
  resources: [
    {
      title: "Le cache de build",
      url: "https://docs.docker.com/build/cache/",
      kind: "doc",
      lang: "en",
      description: "Comment Docker décide de réutiliser ou de reconstruire une couche.",
    },
    {
      title: "Optimiser l'utilisation du cache",
      url: "https://docs.docker.com/build/cache/optimize/",
      kind: "doc",
      lang: "en",
      description: "Ordre des couches, contexte minimal, montages de cache et cache externe en CI.",
    },
    {
      title: "Utiliser le cache de build (concept)",
      url: "https://docs.docker.com/get-started/docker-concepts/building-images/using-the-build-cache/",
      kind: "lab",
      lang: "en",
      description: "Démonstration guidée de l'invalidation du cache, à refaire chez soi.",
    },
    {
      title: "Fichiers .dockerignore",
      url: "https://docs.docker.com/build/concepts/context/#dockerignore-files",
      kind: "doc",
      lang: "en",
      description: "Syntaxe complète : motifs, **, exceptions avec !.",
    },
    {
      title: "Variables de build (ARG, ENV)",
      url: "https://docs.docker.com/build/building/variables/",
      kind: "doc",
      lang: "en",
      description: "Portée des ARG, différence avec ENV, --build-arg.",
    },
    {
      title: "Hadolint",
      url: "https://github.com/hadolint/hadolint",
      kind: "article",
      lang: "en",
      description: "Linter de Dockerfile : détecte automatiquement les mauvaises pratiques.",
    },
  ],
  exercises: [
    {
      id: "dockerignore-complet",
      kind: "file",
      title: "Un .dockerignore complet",
      intro:
        "Le `.dockerignore` utilise la même syntaxe que le `.gitignore` : `*` pour n'importe quels caractères, `**` pour n'importe quel sous-dossier, et `!` pour **ré-inclure** un fichier exclu par une règle précédente. La dernière règle qui correspond l'emporte.",
      fileName: ".dockerignore",
      instruction:
        "Exclus : node_modules, .git, coverage, les fichiers .env* SAUF .env.example, tous les .md SAUF README.md, les journaux (*.log, à tous les niveaux) et les fichiers Docker eux-mêmes (Dockerfile*, compose*.yaml).",
      starter: "# Dépendances et outils\n",
      checks: [
        { pattern: /^\/?node_modules\/?\s*$/m, label: "node_modules" },
        { pattern: /^\/?\.git\/?\s*$/m, label: ".git" },
        { pattern: /^\/?coverage\/?\s*$/m, label: "coverage" },
        { pattern: /^\.env\*\s*$/m, label: ".env*" },
        { pattern: /^!\.env\.example\s*$/m, label: "!.env.example (ré-inclus)" },
        { pattern: /^(\*\*\/)?\*\.md\s*$/m, label: "*.md" },
        { pattern: /^!README\.md\s*$/m, label: "!README.md (ré-inclus)" },
        { pattern: /^\*\*\/\*\.log\s*$/m, label: "**/*.log" },
        { pattern: /^Dockerfile\*\s*$/m, label: "Dockerfile*" },
        { pattern: /^compose\*\.ya?ml\s*$/m, label: "compose*.yaml" },
        { pattern: /^!\.env\.example[\s\S]*^\.env\*\s*$/m, label: "Les exceptions sont placées APRÈS les exclusions", absent: true },
      ],
      solution: `# Dépendances et outils
node_modules
.git
coverage

# Secrets (on garde le modèle)
.env*
!.env.example

# Documentation (sauf le README)
*.md
!README.md

# Journaux, à tous les niveaux
**/*.log

# Fichiers Docker
Dockerfile*
compose*.yaml
`,
    },
    {
      id: "observer-le-cache",
      kind: "command",
      title: "Observer le cache couche par couche",
      intro:
        "Docker réutilise une couche si l'instruction **et** tout ce qui la précède sont identiques ; pour un `COPY`, il compare aussi le contenu des fichiers copiés. Dès qu'une couche change, toutes les suivantes sont reconstruites. Observe les lignes `CACHED` dans la sortie.",
      setup: { files: { ...API_SOURCE } },
      steps: [
        {
          instruction: "Affiche le Dockerfile : les dépendances sont copiées et installées avant le reste du code.",
          rule: { prefixes: [["cat", "Dockerfile"]] },
          solution: "cat Dockerfile",
          hint: "cat Dockerfile",
        },
        {
          instruction: "Construis une première fois l'image api.",
          rule: { prefixes: build, flags: [{ names: ["-t", "--tag"], value: "api" }], args: ["."] },
          solution: "docker build -t api .",
          hint: "docker build -t api .",
        },
        {
          instruction: "Simule une modification du code : ajoute une ligne de commentaire à la fin de server.js.",
          rule: { prefixes: [["echo"]] },
          solution: 'echo "// correctif" >> server.js',
          hint: 'echo "// texte" >> server.js',
        },
        {
          instruction: "Reconstruis : seule la couche COPY . . doit être refaite, npm ci reste en cache.",
          rule: { prefixes: build, flags: [{ names: ["-t", "--tag"], value: "api" }], args: ["."] },
          solution: "docker build -t api .",
          hint: "Même commande qu'à l'étape 2. Repère les lignes CACHED.",
        },
        {
          instruction: "Simule maintenant un changement de dépendances : ajoute une ligne à package-lock.json.",
          rule: { prefixes: [["echo"]] },
          solution: 'echo "" >> package-lock.json',
          hint: 'echo "" >> package-lock.json',
        },
        {
          instruction: "Reconstruis : cette fois, npm ci est relancé, et tout ce qui suit aussi.",
          rule: { prefixes: build, flags: [{ names: ["-t", "--tag"], value: "api" }], args: ["."] },
          solution: "docker build -t api .",
          hint: "Même commande.",
        },
      ],
    },
    {
      id: "ordonner-les-couches",
      kind: "file",
      title: "Réordonner un Dockerfile lent",
      intro:
        "Ce Dockerfile fonctionne, mais chaque modification de code relance l'installation des paquets système **et** des dépendances npm : plusieurs minutes perdues à chaque build. Réorganise-le pour que les couches qui changent rarement soient en haut.",
      fileName: "Dockerfile",
      instruction:
        "1) Copie package.json et package-lock.json et lance npm ci AVANT de copier le code. 2) Regroupe apt-get update et apt-get install en une seule instruction RUN, avec --no-install-recommends, et supprime /var/lib/apt/lists/* dans la même instruction. 3) Utilise un montage de cache pour npm : RUN --mount=type=cache,target=/root/.npm npm ci.",
      starter: `FROM node:22-slim
WORKDIR /app
COPY . .
RUN apt-get update
RUN apt-get install -y curl
RUN npm install
CMD ["node", "server.js"]
`,
      checks: [
        {
          pattern:
            /^RUN\s+apt-get update\s*&&\s*apt-get install\s+-y\s+--no-install-recommends\s+curl\s*&&\s*rm -rf \/var\/lib\/apt\/lists\/\*\s*$/m,
          label: "apt-get update && install --no-install-recommends && rm -rf /var/lib/apt/lists/*",
        },
        { pattern: /^COPY\s+package\*?\.json\s+(package-lock\.json\s+)?\.\/?\s*$/m, label: "COPY package*.json ./" },
        {
          pattern: /^RUN\s+--mount=type=cache,target=\/root\/\.npm\s+npm\s+ci\b/m,
          label: "RUN --mount=type=cache,target=/root/.npm npm ci",
        },
        {
          pattern: /COPY\s+package[\s\S]*RUN[^\n]*npm\s+ci[\s\S]*^COPY\s+\.\s+\.\s*$/m,
          label: "COPY . . après l'installation des dépendances",
        },
        { pattern: /^RUN\s+apt-get update\s*$/m, label: "Plus de RUN apt-get update isolé", absent: true },
        { pattern: /npm install/, label: "npm ci plutôt que npm install", absent: true },
      ],
      solution: `FROM node:22-slim
WORKDIR /app

# Paquets système : changent rarement, une seule couche propre
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Dépendances : relancées seulement si package*.json change
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Code : change souvent, en dernier
COPY . .
CMD ["node", "server.js"]
`,
    },
    {
      id: "entrypoint-arg",
      kind: "file",
      title: "ARG, ENV, LABEL, ENTRYPOINT et CMD",
      intro:
        "`ARG` n'existe que pendant le build (et se règle avec `--build-arg`), `ENV` reste dans l'image. `ENTRYPOINT` fixe le programme principal ; `CMD` en donne les arguments par défaut, que l'utilisateur peut remplacer à `docker run`.",
      fileName: "Dockerfile",
      instruction:
        'Écris un Dockerfile : ARG NODE_VERSION=22 utilisé dans FROM node:${NODE_VERSION}-alpine, ARG APP_VERSION=dev recopié dans ENV APP_VERSION=${APP_VERSION}, LABEL org.opencontainers.image.source=https://github.com/acme/api, puis ENTRYPOINT ["node"] et CMD ["server.js"].',
      starter: "",
      checks: [
        { pattern: /^ARG\s+NODE_VERSION=22\s*$/m, label: "ARG NODE_VERSION=22 (avant FROM)" },
        { pattern: /^FROM\s+node:\$\{NODE_VERSION\}-alpine\s*$/m, label: "FROM node:${NODE_VERSION}-alpine" },
        { pattern: /^ARG\s+APP_VERSION=dev\s*$/m, label: "ARG APP_VERSION=dev" },
        { pattern: /^ENV\s+APP_VERSION=\$\{?APP_VERSION\}?\s*$/m, label: "ENV APP_VERSION=${APP_VERSION}" },
        {
          pattern: /^LABEL\s+org\.opencontainers\.image\.source=["']?https:\/\/github\.com\/acme\/api["']?\s*$/m,
          label: "LABEL org.opencontainers.image.source",
        },
        { pattern: /^ENTRYPOINT\s+\[\s*"node"\s*\]\s*$/m, label: 'ENTRYPOINT ["node"]' },
        { pattern: /^CMD\s+\[\s*"server\.js"\s*\]\s*$/m, label: 'CMD ["server.js"]' },
        { pattern: /^ARG\s+NODE_VERSION[\s\S]*^FROM/m, label: "ARG NODE_VERSION déclaré avant FROM" },
      ],
      solution: `ARG NODE_VERSION=22
FROM node:\${NODE_VERSION}-alpine

ARG APP_VERSION=dev
ENV APP_VERSION=\${APP_VERSION}
LABEL org.opencontainers.image.source=https://github.com/acme/api

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER node

ENTRYPOINT ["node"]
CMD ["server.js"]
`,
    },
    {
      id: "build-args",
      kind: "command",
      title: "Paramétrer un build",
      intro:
        "Avec `ARG` et `--build-arg`, un même Dockerfile produit plusieurs variantes : version de Node, numéro de version de l'application gravé dans l'image…",
      setup: {
        files: {
          ...API_SOURCE,
          Dockerfile:
            'ARG NODE_VERSION=22\nFROM node:${NODE_VERSION}-alpine\n\nARG APP_VERSION=dev\nENV APP_VERSION=${APP_VERSION}\n\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nUSER node\nCMD ["node", "server.js"]\n',
        },
      },
      steps: [
        {
          instruction: "Construis api:1.4.2 en passant APP_VERSION=1.4.2.",
          rule: {
            prefixes: build,
            flags: [
              { names: ["--build-arg"], value: "APP_VERSION=1.4.2" },
              { names: ["-t", "--tag"], value: "api:1.4.2" },
            ],
            args: ["."],
          },
          solution: "docker build --build-arg APP_VERSION=1.4.2 -t api:1.4.2 .",
          hint: "--build-arg NOM=valeur",
        },
        {
          instruction: "Construis une variante api:1.4.2-node20 basée sur Node 20 (NODE_VERSION=20), avec la même APP_VERSION.",
          rule: {
            prefixes: build,
            flags: [
              { names: ["--build-arg"], value: "NODE_VERSION=20" },
              { names: ["--build-arg"], value: "APP_VERSION=1.4.2" },
              { names: ["-t", "--tag"], value: "api:1.4.2-node20" },
            ],
            args: ["."],
          },
          solution: "docker build --build-arg NODE_VERSION=20 --build-arg APP_VERSION=1.4.2 -t api:1.4.2-node20 .",
          hint: "--build-arg se répète, une fois par variable.",
        },
        {
          instruction: "Lance api:1.4.2 en arrière-plan sous le nom api.",
          rule: {
            prefixes: [
              ["docker", "run"],
              ["docker", "container", "run"],
            ],
            flags: [{ names: ["-d", "--detach"] }, { names: ["--name"], value: "api" }],
            args: ["api:1.4.2"],
          },
          solution: "docker run -d --name api api:1.4.2",
          hint: "docker run -d --name api api:1.4.2",
        },
        {
          instruction: "Vérifie que la version est bien gravée dans l'image : affiche APP_VERSION dans le conteneur.",
          rule: {
            prefixes: [
              ["docker", "exec"],
              ["docker", "container", "exec"],
            ],
            args: ["api", "printenv", "APP_VERSION"],
          },
          solution: "docker exec api printenv APP_VERSION",
          hint: "docker exec api printenv APP_VERSION",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Tu modifies une ligne de `server.js`. Quelles couches sont reconstruites dans un Dockerfile bien ordonné ?",
      choices: ["Toutes", "Seulement le COPY . . et les instructions qui le suivent", "Aucune", "Seulement le FROM"],
      answer: 1,
      explanation: "Les couches précédentes (dépendances) ont les mêmes entrées : elles sont réutilisées depuis le cache.",
    },
    {
      question: "Dans un `.dockerignore`, que fait la ligne `!README.md` placée après `*.md` ?",
      choices: [
        "Elle exclut README.md",
        "Elle ré-inclut README.md malgré la règle *.md",
        "C'est une erreur de syntaxe",
        "Elle n'a aucun effet",
      ],
      answer: 1,
      explanation:
        "La dernière règle qui correspond l'emporte : placée après, l'exception gagne. Placée avant, elle serait écrasée par `*.md`.",
    },
    {
      question: "Pourquoi écrire `apt-get update && apt-get install … && rm -rf /var/lib/apt/lists/*` dans un seul RUN ?",
      choices: [
        "C'est plus lisible",
        "Pour éviter un index apt périmé en cache et ne pas garder les listes de paquets dans une couche",
        "Docker n'accepte qu'un seul RUN",
        "Pour exécuter en root",
      ],
      answer: 1,
      explanation:
        "Séparés, `update` peut rester en cache avec un vieil index ; et un fichier supprimé dans une couche suivante occupe toujours de la place dans la précédente.",
    },
    {
      question: "Quelle est la différence entre ARG et ENV ?",
      choices: [
        "Aucune",
        "ARG n'existe que pendant le build ; ENV est conservée dans l'image et visible par le conteneur",
        "ENV n'existe que pendant le build",
        "ARG est réservé à FROM",
      ],
      answer: 1,
      explanation: "Pour garder une valeur d'ARG à l'exécution, on la recopie : `ENV APP_VERSION=${APP_VERSION}`.",
    },
    {
      question: 'Avec `ENTRYPOINT ["node"]` et `CMD ["server.js"]`, que lance `docker run image worker.js` ?',
      choices: ["node server.js", "node worker.js", "worker.js seul", "une erreur"],
      answer: 1,
      explanation: "Les arguments de docker run remplacent CMD ; ENTRYPOINT reste. Pour changer l'ENTRYPOINT : `--entrypoint`.",
    },
    {
      question: "À quoi sert `RUN --mount=type=cache,target=/root/.npm npm ci` ?",
      choices: [
        "À mettre node_modules dans l'image finale",
        "À conserver le cache de téléchargement de npm entre deux builds, sans l'inclure dans l'image",
        "À désactiver le cache",
        "À monter le code source",
      ],
      answer: 1,
      explanation:
        "Même quand la couche doit être refaite, les paquets déjà téléchargés sont réutilisés : l'installation est bien plus rapide.",
    },
  ],
};

import type { Module } from "../types";

const run = [
  ["docker", "run"],
  ["docker", "container", "run"],
];

const CONFIG_COMPOSE = `services:
  web:
    image: nginx:alpine
    ports:
      - "\${APP_PORT}:80"
`;

export const configuration: Module = {
  id: "configuration",
  title: "Configuration et secrets",
  description: "Variables d'environnement, fichiers .env et secrets : une image, plusieurs environnements.",
  icon: "sliders",
  videos: [
    { youtubeId: "hhX87u-omlI", title: "Variables d'environnement (ENV, env-file…)", author: "xavki", duration: "5:42", lang: "fr" },
    {
      youtubeId: "wKpo3VG4uUs",
      title: "Comment utiliser les variables d'environnement en 8 minutes",
      author: "eazytraining",
      duration: "8:24",
      lang: "fr",
    },
  ],
  resources: [
    {
      title: "Variables d'environnement dans Compose",
      url: "https://docs.docker.com/compose/how-tos/environment-variables/",
      kind: "doc",
      lang: "en",
      description: "Toutes les façons de passer une variable à un service.",
    },
    {
      title: "Interpolation des variables",
      url: "https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/",
      kind: "doc",
      lang: "en",
      description: "${VAR}, valeurs par défaut et fichier .env.",
    },
    {
      title: "Secrets avec Compose",
      url: "https://docs.docker.com/compose/how-tos/use-secrets/",
      kind: "doc",
      lang: "en",
      description: "Monter des secrets en fichiers plutôt qu'en variables.",
    },
    {
      title: "Secrets au moment du build",
      url: "https://docs.docker.com/build/building/secrets/",
      kind: "doc",
      lang: "en",
      description: "Utiliser un jeton pendant le build sans qu'il reste dans l'image.",
    },
    {
      title: "The Twelve-Factor App : configuration",
      url: "https://12factor.net/fr/config",
      kind: "article",
      lang: "fr",
      description: "Le principe de référence : la configuration vit dans l'environnement.",
    },
  ],
  exercises: [
    {
      id: "variables",
      kind: "command",
      title: "Une application qui attend sa configuration",
      intro:
        "Une bonne image ne contient **aucune** configuration propre à un environnement : elle la lit dans des variables. Cette API refuse de démarrer sans `DATABASE_URL`. Une base `db` tourne déjà sur le réseau `app-net`.",
      setup: {
        customImages: [{ ref: "api:1.0", base: "node:22-alpine", user: "node" }],
        networks: ["app-net"],
        files: { ".env": "DATABASE_URL=postgres://postgres:s3cret@db:5432/app\nNODE_ENV=production\n" },
        app: { requiredEnv: ["DATABASE_URL"], urlEnv: ["DATABASE_URL"] },
        commands: ["docker run -d --name db --network app-net -e POSTGRES_PASSWORD=s3cret postgres:16"],
      },
      steps: [
        {
          instruction: "Lance api:1.0 en arrière-plan, nommée api, sur le réseau app-net, sans aucune variable.",
          rule: {
            prefixes: run,
            flags: [
              { names: ["-d", "--detach"] },
              { names: ["--name"], value: "api" },
              { names: ["--network", "--net"], value: "app-net" },
            ],
            args: ["api:1.0"],
          },
          solution: "docker run -d --name api --network app-net api:1.0",
          hint: "docker run -d --name … --network … <image>",
        },
        {
          instruction: "Le conteneur s'est arrêté. Lis ses journaux pour comprendre pourquoi.",
          rule: {
            prefixes: [
              ["docker", "logs"],
              ["docker", "container", "logs"],
            ],
            args: ["api"],
          },
          solution: "docker logs api",
          hint: "Les journaux restent disponibles même quand le conteneur est arrêté.",
        },
        {
          instruction: "Supprime ce conteneur raté.",
          rule: {
            prefixes: [
              ["docker", "rm"],
              ["docker", "container", "rm"],
            ],
            args: ["api"],
          },
          solution: "docker rm api",
          hint: "docker rm <nom>",
        },
        {
          instruction: "Affiche le fichier .env préparé par l'équipe.",
          rule: { prefixes: [["cat", ".env"]] },
          solution: "cat .env",
          hint: "cat <fichier>",
        },
        {
          instruction: "Relance l'API (même nom, même réseau) en lui passant ce fichier avec --env-file.",
          rule: {
            prefixes: run,
            flags: [
              { names: ["-d", "--detach"] },
              { names: ["--name"], value: "api" },
              { names: ["--network", "--net"], value: "app-net" },
              { names: ["--env-file"], value: ".env" },
            ],
            args: ["api:1.0"],
          },
          solution: "docker run -d --name api --network app-net --env-file .env api:1.0",
          hint: "--env-file <fichier>",
        },
        {
          instruction: "Vérifie la valeur de DATABASE_URL vue par le conteneur.",
          rule: {
            prefixes: [
              ["docker", "exec"],
              ["docker", "container", "exec"],
            ],
            args: ["api", "printenv", "DATABASE_URL"],
          },
          solution: "docker exec api printenv DATABASE_URL",
          hint: "docker exec <conteneur> printenv <VARIABLE>",
        },
      ],
    },
    {
      id: "compose-env",
      kind: "file",
      title: "Sortir les secrets du compose.yaml",
      intro:
        "Un compose.yaml est versionné avec le code : il ne doit contenir **aucun mot de passe**. Les valeurs sensibles vont dans un fichier `.env` (ignoré par Git), lu par `env_file` ou par interpolation `${VARIABLE}`.",
      fileName: "compose.yaml",
      instruction:
        "Corrige ce fichier : l'API lit ses variables dans le fichier .env (env_file), la base reçoit son mot de passe via ${DB_PASSWORD}, et l'image de l'API utilise le tag ${TAG:-latest}.",
      starter: `services:
  api:
    image: acme/api:1.0
    environment:
      DATABASE_URL: postgres://postgres:Sup3rSecret@db:5432/app

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: Sup3rSecret
`,
      checks: [
        { pattern: /^ {4}image:\s*["']?acme\/api:\$\{TAG:-latest\}["']?\s*$/m, label: "image: acme/api:${TAG:-latest}" },
        { pattern: /^ {4}env_file:\s*(\n\s+-\s*\.env|\s*\.env)\s*$/m, label: "env_file: .env pour l'API" },
        { pattern: /POSTGRES_PASSWORD:\s*["']?\$\{DB_PASSWORD\}["']?/m, label: "POSTGRES_PASSWORD: ${DB_PASSWORD}" },
        { pattern: /Sup3rSecret/, label: "Plus aucun mot de passe en clair", absent: true },
      ],
      solution: `services:
  api:
    image: acme/api:\${TAG:-latest}
    env_file:
      - .env

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: \${DB_PASSWORD}
`,
    },
    {
      id: "interpolation",
      kind: "command",
      title: "Variables manquantes et fichier .env",
      intro:
        "Compose remplace `${VARIABLE}` par la valeur trouvée dans le shell ou dans le fichier `.env` du projet. `docker compose config` affiche le résultat final : l'outil idéal pour vérifier une configuration avant de la lancer.",
      setup: { files: { "compose.yaml": CONFIG_COMPOSE }, images: ["nginx:alpine"] },
      steps: [
        {
          instruction: "Affiche la configuration résolue par Compose et observe l'avertissement.",
          rule: { prefixes: [["docker", "compose", "config"]] },
          solution: "docker compose config",
          hint: "docker compose config",
        },
        {
          instruction: "Ajoute la ligne APP_PORT=8080 au fichier .env (crée-le avec echo et une redirection >>).",
          rule: { prefixes: [["echo", "APP_PORT=8080"]], args: [] },
          solution: 'echo "APP_PORT=8080" >> .env',
          hint: 'echo "TEXTE" >> fichier ajoute une ligne à la fin du fichier.',
        },
        {
          instruction: "Affiche à nouveau la configuration : la variable est maintenant résolue.",
          rule: { prefixes: [["docker", "compose", "config"]] },
          solution: "docker compose config",
          hint: "Même commande qu'à l'étape 1.",
        },
        {
          instruction: "Démarre la stack en arrière-plan.",
          rule: { prefixes: [["docker", "compose", "up"]], flags: [{ names: ["-d", "--detach"] }] },
          solution: "docker compose up -d",
          hint: "docker compose up -d",
        },
        {
          instruction: "Vérifie que nginx répond sur http://localhost:8080.",
          rule: {
            prefixes: [
              ["curl", "localhost:8080"],
              ["curl", "http://localhost:8080"],
              ["curl", "localhost:8080/"],
              ["curl", "http://localhost:8080/"],
            ],
          },
          solution: "curl localhost:8080",
          hint: "curl localhost:8080",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Où doit vivre le mot de passe de la base de données de production ?",
      choices: [
        "Dans le Dockerfile (ENV)",
        "Dans compose.yaml, versionné avec le code",
        "Dans l'environnement d'exécution (.env non versionné, secret manager…)",
        "Dans l'image publiée sur Docker Hub",
      ],
      answer: 2,
      explanation: "Tout ce qui est dans l'image ou dans le dépôt Git doit être considéré comme public.",
    },
    {
      question: "Que fait `${TAG:-latest}` dans un compose.yaml ?",
      choices: [
        "Il utilise toujours latest",
        "Il utilise la variable TAG, ou latest si elle est absente ou vide",
        "Il supprime le tag",
        "C'est une erreur de syntaxe",
      ],
      answer: 1,
      explanation: "La syntaxe `:-` fournit une valeur par défaut, comme dans un shell.",
    },
    {
      question: "Quelle différence entre `env_file:` et le fichier `.env` du projet ?",
      choices: [
        "Aucune",
        "`.env` sert à l'interpolation de compose.yaml ; `env_file` injecte des variables dans le conteneur",
        "`env_file` est réservé à la production",
        "`.env` est lu par le conteneur",
      ],
      answer: 1,
      explanation: "Le `.env` à côté de compose.yaml remplace les `${VAR}` ; `env_file` transmet son contenu au processus du conteneur.",
    },
    {
      question: "Pourquoi éviter `ENV API_KEY=…` dans un Dockerfile ?",
      choices: [
        "C'est plus lent",
        "La clé est gravée dans l'image : visible avec docker inspect / history par quiconque récupère l'image",
        "Docker l'interdit",
        "Les variables ENV ne marchent pas",
      ],
      answer: 1,
      explanation:
        "Pour un secret nécessaire au build, on utilise `RUN --mount=type=secret` ; au runtime, une variable ou un fichier de secret.",
    },
    {
      question: "Comment vérifier les valeurs finales calculées par Compose avant de lancer quoi que ce soit ?",
      choices: ["docker compose ps", "docker compose config", "docker compose logs", "docker inspect"],
      answer: 1,
      explanation:
        "`config` fusionne les fichiers, interpole les variables et affiche le résultat — avec un avertissement pour chaque variable manquante.",
    },
  ],
};

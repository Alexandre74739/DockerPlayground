import { API_SOURCE } from "../content/fixtures";
import { container, http, image, machine, probe, projectFile, rebuildAfterCodeChange, remoteContainer } from "./checks";
import type { PracticeCase } from "./types";

/** Cas pratiques ajoutés : déploiement sur VPS, sécurité, .dockerignore, cache de build, CI. */

const VPS_IP = "203.0.113.10";
const VPS_PASSWORD = "Vps!2024";
const LOCAL_KEY_PATH = "/home/alex/.ssh/id_ed25519.pub";
const SHOP_APP = { requiredEnv: ["DATABASE_URL"], urlEnv: ["DATABASE_URL"], response: "Boutique API OK" };

const SHOP_COMPOSE = `name: boutique

services:
  api:
    image: acme/boutique-api:1.0
    ports:
      - "80:3000"
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://postgres:\${DB_PASSWORD}@db:5432/shop
    depends_on:
      - db

  db:
    image: postgres:16
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`;

const SLOW_DOCKERFILE = `FROM node:22-slim
WORKDIR /app
COPY . .
RUN apt-get update
RUN apt-get install -y curl
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"]
`;

const LEAKY_WORKFLOW = `name: release

on:
  push:
    branches: [main]

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo dckr_pat_7Hq2LmZ9xVb4 | docker login -u acmebot --password-stdin
      - run: docker build -t acme/api:latest .
      - run: docker push acme/api:latest
`;

const portClosed = (state: Parameters<typeof probe>[0], port: string) => probe(state, ["nc", "-zv", VPS_IP, port]).code !== 0;
const vpsHttp = (state: Parameters<typeof probe>[0]) => probe(state, ["curl", `http://${VPS_IP}`]);

export const vpsCases: PracticeCase[] = [
  {
    id: "deployer-vps",
    title: "Mettre la boutique en production sur le VPS",
    summary: "Déployer l'API de la boutique et sa base sur un VPS, avec une connexion par clé SSH et une base non exposée.",
    level: "Avancé",
    duration: "30 min",
    skills: ["ssh", "ssh-copy-id", "docker context", "compose", "sécurité"],
    moduleIds: ["vps", "compose-equipe"],
    brief: `**De :** Thomas, responsable technique
**Objet :** Mise en production de la boutique

Le VPS est livré : \`${VPS_IP}\`, utilisateur \`deploy\`, mot de passe \`${VPS_PASSWORD}\`. Docker y est déjà installé.

À déployer :
- l'API \`acme/boutique-api:1.0\` (publiée sur Docker Hub) : elle écoute sur le port 3000 et lit \`DATABASE_URL\` ;
- sa base \`postgres:16\`, avec ses données dans un **volume nommé**.

Exigences :
- la boutique doit répondre sur **http://${VPS_IP}** (port 80) ;
- la base ne doit **jamais** être joignable depuis Internet ;
- les deux services redémarrent seuls après un reboot du serveur ;
- on n'utilise plus le mot de passe SSH : installe **ta clé**.

Le projet local est vide : à toi d'écrire la configuration.`,
    setup: {
      files: { "README.md": `# Boutique\n\nServeur de production : deploy@${VPS_IP}\n` },
      hub: { "acme/boutique-api": { tags: ["1.0"] } },
      app: SHOP_APP,
      machines: {
        "vps-prod": {
          ip: VPS_IP,
          names: ["vps.acme.fr"],
          user: "deploy",
          password: VPS_PASSWORD,
          dockerInstalled: true,
          dockerGroup: true,
        },
      },
    },
    objectives: [
      {
        id: "key",
        label: "Ta clé SSH est installée sur le serveur",
        points: 15,
        hint: "ssh-keygen -t ed25519, puis ssh-copy-id deploy@…",
        check: ({ state }) => {
          const key =
            state.machines.local.data.files[LOCAL_KEY_PATH]?.trim() ??
            (state.machine === "local" ? state.files[LOCAL_KEY_PATH]?.trim() : undefined);
          return Boolean(key) && state.machines["vps-prod"].authorizedKeys.includes(key!);
        },
      },
      {
        id: "http",
        label: `La boutique répond sur http://${VPS_IP}`,
        points: 30,
        hint: "Publie 80:3000 pour l'API ; DATABASE_URL doit viser l'hôte db avec le bon mot de passe.",
        check: ({ state }) => vpsHttp(state).out === SHOP_APP.response,
      },
      {
        id: "db-private",
        label: "La base tourne sur le serveur et le port 5432 est fermé depuis Internet",
        points: 20,
        hint: "Ne publie pas le port de la base (ou lie-le à 127.0.0.1).",
        check: ({ state }) => remoteContainer(state, "vps-prod", "db")?.status === "running" && portClosed(state, "5432"),
      },
      {
        id: "restart",
        label: "L'API et la base redémarrent automatiquement",
        points: 15,
        hint: "restart: unless-stopped sur chaque service.",
        check: ({ state }) =>
          ["api", "db"].every((name) => ["always", "unless-stopped"].includes(remoteContainer(state, "vps-prod", name)?.restart ?? "")),
      },
      {
        id: "volume",
        label: "Les données Postgres sont dans un volume nommé",
        points: 10,
        hint: "volumes: - pgdata:/var/lib/postgresql/data, déclaré en bas du fichier.",
        check: ({ state }) =>
          Boolean(
            remoteContainer(state, "vps-prod", "db")?.mounts.some(
              (mount) => mount.type === "volume" && mount.target === "/var/lib/postgresql/data" && !/^[0-9a-f]{64}$/.test(mount.source),
            ),
          ),
      },
      {
        id: "compose",
        label: "Les services sont décrits et gérés avec Docker Compose",
        points: 10,
        hint: "Un compose.yaml, lancé sur le serveur (scp + ssh) ou via un contexte docker ssh://.",
        check: ({ state }) => ["api", "db"].every((name) => Boolean(remoteContainer(state, "vps-prod", name)?.compose)),
      },
    ],
    solution: {
      files: {
        ".env": "DB_PASSWORD=Pr0d-s3cret\n",
        "compose.yaml": `services:
  api:
    image: acme/boutique-api:1.0
    ports:
      - "80:3000"
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://postgres:\${DB_PASSWORD}@db:5432/shop
    depends_on:
      - db

  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`,
      },
      commands: [
        'ssh-keygen -t ed25519 -C "alex@acme.fr"',
        `ssh-copy-id deploy@${VPS_IP}`,
        `docker context create vps --docker "host=ssh://deploy@${VPS_IP}"`,
        "docker context use vps",
        "docker compose up -d",
      ],
    },
  },
  {
    id: "securiser-vps",
    title: "Audit de sécurité : base exposée",
    summary: "L'audit a trouvé la base de production ouverte sur Internet : la refermer sans interrompre la boutique ni perdre de données.",
    level: "Intermédiaire",
    duration: "20 min",
    skills: ["ports", "127.0.0.1", "scp", "compose", "données"],
    moduleIds: ["vps", "volumes-reseaux"],
    brief: `**Rapport d'audit — gravité : critique**
**Constat :** le port **5432** (PostgreSQL) du serveur \`${VPS_IP}\` est accessible depuis Internet.

La boutique tourne avec Docker Compose sur le serveur, dans \`~/app\` (projet \`boutique\`). Une copie à jour de la configuration est dans ton projet local. Ta clé SSH est déjà autorisée pour \`deploy\`.

À faire :
- la base ne doit plus être joignable depuis l'extérieur ;
- la boutique doit continuer à répondre sur http://${VPS_IP} ;
- les données clients (volume \`boutique_pgdata\`) doivent être **intactes** ;
- la configuration présente sur le serveur doit refléter la correction (le prochain collègue qui fera \`docker compose up\` ne doit pas rouvrir le port).`,
    setup: {
      sshKey: true,
      files: { "compose.yaml": SHOP_COMPOSE, ".env": "DB_PASSWORD=Pr0d-s3cret\n" },
      hub: { "acme/boutique-api": { tags: ["1.0"] } },
      app: SHOP_APP,
      machines: {
        "vps-prod": {
          ip: VPS_IP,
          names: ["vps.acme.fr"],
          user: "deploy",
          password: VPS_PASSWORD,
          dockerInstalled: true,
          dockerGroup: true,
          authorizeLocalKey: true,
          knownByLocal: true,
          dirs: ["app"],
          files: { "app/compose.yaml": SHOP_COMPOSE, "app/.env": "DB_PASSWORD=Pr0d-s3cret\n" },
          commands: ["cd app && docker compose up -d"],
        },
      },
    },
    objectives: [
      {
        id: "closed",
        label: "Le port 5432 n'est plus joignable depuis Internet",
        points: 40,
        hint: "nc -zv … 5432 depuis ton poste pour vérifier.",
        check: ({ state }) => portClosed(state, "5432"),
      },
      {
        id: "http",
        label: `La boutique répond toujours sur http://${VPS_IP}`,
        points: 20,
        hint: "Seul le service db doit changer.",
        check: ({ state }) => vpsHttp(state).out === SHOP_APP.response,
      },
      {
        id: "data",
        label: "Le volume boutique_pgdata n'a pas été recréé (données intactes)",
        points: 20,
        hint: "N'utilise pas docker compose down -v.",
        check: ({ state, initial }) => {
          const before = initial.machines["vps-prod"].data.volumes.find((volume) => volume.name === "boutique_pgdata");
          const after = machine(state, "vps-prod").volumes.find((volume) => volume.name === "boutique_pgdata");
          return Boolean(before && after && before.createdAt === after.createdAt);
        },
      },
      {
        id: "server-config",
        label: "Le compose.yaml du serveur ne publie plus 5432 sur toutes les interfaces",
        points: 20,
        hint: "Corrige le fichier local puis copie-le avec scp dans ~/app/.",
        check: ({ state }) => {
          const file = machine(state, "vps-prod").files["/home/deploy/app/compose.yaml"] ?? "";
          return Boolean(file) && !/^\s*-\s*["']?(0\.0\.0\.0:)?5432:5432/m.test(file);
        },
      },
    ],
    solution: {
      files: { "compose.yaml": SHOP_COMPOSE.replace('      - "5432:5432"', '      - "127.0.0.1:5432:5432"') },
      commands: [`scp compose.yaml deploy@${VPS_IP}:~/app/`, `ssh deploy@${VPS_IP} "cd app && docker compose up -d"`],
    },
  },
  {
    id: "image-data",
    title: "Conteneuriser l'API de l'équipe data",
    summary:
      "Une API Python avec environnement virtuel, notebooks et gros jeux de données : n'embarquer que l'essentiel grâce au .dockerignore.",
    level: "Intermédiaire",
    duration: "20 min",
    skills: ["Dockerfile", ".dockerignore", "Python", "USER"],
    moduleIds: ["dockeriser", "dockerfile-avance", "securite"],
    brief: `**De :** Inès, data scientist
**Objet :** Mettre notre API de prédiction en conteneur

Notre API Flask (\`app.py\`, port **8000**) doit partir en recette. Le dossier contient tout notre bazar de travail : environnement virtuel \`.venv\`, caches \`__pycache__\`, notebooks, et 2 Go de données brutes dans \`data/raw/\`.

Ce qu'on attend :
- une image \`data-api:1.0\` légère (**moins de 300 Mo**) ;
- l'application ne tourne **pas en root** ;
- ni \`.venv\`, ni les caches, ni les notebooks, ni \`data/raw/\`, ni le \`.env\` ne doivent être dans l'image ;
- par contre \`data/reference.csv\` **est indispensable** à l'application ;
- un conteneur \`data-api\` qui répond sur http://localhost:8000.`,
    setup: {
      files: {
        "app.py":
          'from flask import Flask\nimport csv\n\napp = Flask(__name__)\nREFERENCE = list(csv.reader(open("data/reference.csv")))\n\n@app.get("/")\ndef index():\n    return "Prediction API OK"\n\nif __name__ == "__main__":\n    app.run(host="0.0.0.0", port=8000)\n',
        "requirements.txt": "flask==3.0.3\npandas==2.2.3\n",
        ".env": "MODEL_API_KEY=sk-data-2f9a7c\n",
        ".venv/bin/python": "#!/usr/bin/env python3\n",
        ".venv/lib/python3.12/site-packages/flask/__init__.py": "# flask\n",
        "__pycache__/app.cpython-312.pyc": "\u0000pyc",
        "notebooks/exploration.ipynb": '{ "cells": [] }\n',
        "data/raw/ventes-2024.csv": "date,montant\n".repeat(50),
        "data/reference.csv": "code,libelle\nA1,Alimentaire\n",
        "tests/test_app.py": "def test_index():\n    assert True\n",
      },
      app: { port: 8000, response: "Prediction API OK" },
    },
    objectives: [
      {
        id: "image",
        label: "L'image data-api:1.0 existe",
        points: 10,
        hint: "docker build -t data-api:1.0 .",
        check: ({ state }) => Boolean(image(state, "data-api:1.0")),
      },
      {
        id: "size",
        label: "Elle pèse moins de 300 Mo",
        points: 15,
        hint: "python:3.12-slim plutôt que python:3.12.",
        check: ({ state }) => (image(state, "data-api:1.0")?.size ?? Infinity) < 300_000_000,
      },
      {
        id: "user",
        label: "L'application ne tourne pas en root",
        points: 15,
        hint: "Crée un utilisateur (adduser) et bascule avec USER.",
        check: ({ state }) => {
          const user = image(state, "data-api:1.0")?.user;
          return Boolean(user) && user !== "root";
        },
      },
      {
        id: "excluded",
        label: "Ni .venv, ni caches, ni notebooks, ni data/raw, ni .env dans l'image",
        points: 25,
        hint: "Un .dockerignore avec ces dossiers ; attention au motif **/__pycache__.",
        check: ({ state }) => {
          const paths = Object.keys(image(state, "data-api:1.0")?.fs ?? {});
          return paths.length > 0 && !paths.some((path) => /\/(\.venv|__pycache__|notebooks|raw)\/|\.env$|\.pyc$/.test(path));
        },
      },
      {
        id: "reference",
        label: "data/reference.csv est bien présent dans l'image",
        points: 15,
        hint: "data/* puis !data/reference.csv, dans cet ordre.",
        check: ({ state }) => Object.keys(image(state, "data-api:1.0")?.fs ?? {}).some((path) => path.endsWith("/data/reference.csv")),
      },
      {
        id: "run",
        label: "Un conteneur data-api répond sur http://localhost:8000",
        points: 20,
        hint: "docker run -d --name data-api -p 8000:8000 data-api:1.0",
        check: ({ state }) =>
          container(state, "data-api")?.image === "data-api:1.0" && http(state, "localhost:8000") === "Prediction API OK",
      },
    ],
    solution: {
      files: {
        Dockerfile:
          'FROM python:3.12-slim\nWORKDIR /app\nRUN addgroup --system app && adduser --system --ingroup app app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY --chown=app:app . .\nUSER app\nEXPOSE 8000\nCMD ["python", "app.py"]\n',
        ".dockerignore": ".venv\n**/__pycache__\n*.pyc\nnotebooks\ntests\n.env\ndata/*\n!data/reference.csv\n",
      },
      commands: ["docker build -t data-api:1.0 .", "docker run -d --name data-api -p 8000:8000 data-api:1.0"],
    },
  },
  {
    id: "cache-rapide",
    title: "Des builds dix fois plus rapides",
    summary: "Chaque modification de code relance toute l'installation : réorganiser le Dockerfile pour profiter du cache.",
    level: "Intermédiaire",
    duration: "15 min",
    skills: ["cache", "ordre des couches", "npm ci", ".dockerignore"],
    moduleIds: ["dockerfile-avance"],
    brief: `**De :** Karim, administrateur système
**Objet :** La CI met 6 minutes à chaque commit

À chaque modification d'une seule ligne de code, le build de l'API relance \`apt-get\` et \`npm install\`. La CI est saturée.

Corrige le Dockerfile pour que :
- une modification **du code seul** ne relance plus l'installation des dépendances ;
- les dépendances soient installées de façon reproductible (\`npm ci\`) ;
- les paquets système soient installés proprement, en une couche nettoyée ;
- le dossier \`node_modules\` local ne parte plus dans le contexte de build.

Construis l'image \`api:dev\` et lance un conteneur \`api-dev\` sur le port 3000 pour qu'on vérifie.`,
    setup: {
      files: {
        "package.json": API_SOURCE["package.json"],
        "package-lock.json": API_SOURCE["package-lock.json"],
        "server.js":
          'const express = require("express");\nconst app = express();\napp.get("/", (req, res) => res.send("Hello from Docker!"));\napp.listen(3000);\n',
        Dockerfile: SLOW_DOCKERFILE,
        "node_modules/express/package.json": '{ "name": "express" }\n',
      },
    },
    objectives: [
      {
        id: "image",
        label: "L'image api:dev existe",
        points: 10,
        hint: "docker build -t api:dev .",
        check: ({ state }) => Boolean(image(state, "api:dev")),
      },
      {
        id: "cache",
        label: "Après une modification du code seul, l'installation des dépendances reste en cache",
        points: 35,
        hint: "Copie package*.json et installe AVANT de copier le reste du code.",
        check: ({ state }) =>
          Boolean(image(state, "api:dev")) &&
          /CACHED \[\d+\/\d+\] RUN [^\n]*npm (ci|install)/.test(rebuildAfterCodeChange(state, "api:dev", "server.js")),
      },
      {
        id: "ci",
        label: "Les dépendances sont installées avec npm ci",
        points: 10,
        hint: "npm ci respecte package-lock.json.",
        check: ({ state }) =>
          /^RUN\s+.*npm\s+ci\b/m.test(projectFile(state, "Dockerfile") ?? "") &&
          !/npm install/.test(projectFile(state, "Dockerfile") ?? ""),
      },
      {
        id: "apt",
        label: "Les paquets système sont installés en une seule couche nettoyée",
        points: 15,
        hint: "RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*",
        check: ({ state }) => {
          const file = projectFile(state, "Dockerfile") ?? "";
          return (
            /apt-get update\s*&&\s*apt-get install[^\n]*&&\s*rm -rf \/var\/lib\/apt\/lists/.test(file.replace(/\\\n\s*/g, " ")) &&
            !/^RUN\s+apt-get update\s*$/m.test(file)
          );
        },
      },
      {
        id: "ignore",
        label: "Le node_modules local ne part plus dans l'image",
        points: 15,
        hint: "Un .dockerignore avec node_modules.",
        check: ({ state }) => {
          const built = image(state, "api:dev");
          return Boolean(built) && !Object.keys(built!.fs).some((path) => path.includes("/node_modules/"));
        },
      },
      {
        id: "run",
        label: "Un conteneur api-dev répond sur http://localhost:3000",
        points: 15,
        hint: "docker run -d --name api-dev -p 3000:3000 api:dev",
        check: ({ state }) => container(state, "api-dev")?.image === "api:dev" && http(state, "localhost:3000") === "Hello from Docker!",
      },
    ],
    solution: {
      files: {
        Dockerfile: `FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
`,
        ".dockerignore": "node_modules\n.git\n",
      },
      commands: ["docker build -t api:dev .", "docker run -d --name api-dev -p 3000:3000 api:dev"],
    },
  },
  {
    id: "pipeline-ci",
    title: "Sécuriser et automatiser la publication",
    summary: "Le workflow de publication contient un jeton en clair : le réécrire proprement, multi-plateforme et versionné.",
    level: "Intermédiaire",
    duration: "20 min",
    skills: ["GitHub Actions", "secrets", "buildx", "tags"],
    moduleIds: ["hub-equipe"],
    brief: `**De :** Thomas, responsable des releases
**Objet :** Workflow de publication à refaire

Un stagiaire a écrit \`.github/workflows/release.yml\`. Il fonctionne, mais :
- le **jeton Docker Hub est écrit en clair** dans le fichier (il est déjà révoqué) ;
- il publie à chaque push sur \`main\` au lieu de chaque tag de version \`v*\` ;
- il ne construit que pour amd64 alors que l'équipe a des Mac arm64 ;
- les tags sont toujours \`latest\`.

Réécris le workflow avec les actions officielles Docker : connexion via les **secrets** \`DOCKERHUB_USERNAME\` / \`DOCKERHUB_TOKEN\`, QEMU et Buildx, \`docker/metadata-action\` pour générer les tags à partir de la version (image \`acme/api\`), build multi-plateforme et cache GitHub Actions.

Avant de pousser, vérifie que le Dockerfile se construit localement : tague le résultat \`acme/api:ci-test\`.`,
    setup: { files: { ...API_SOURCE, ".github/workflows/release.yml": LEAKY_WORKFLOW } },
    objectives: [
      {
        id: "trigger",
        label: "Le workflow se déclenche sur les tags v*",
        points: 10,
        hint: "on: push: tags: ['v*']",
        check: ({ state }) =>
          /tags:\s*(\[\s*["']?v\*["']?\s*\]|\n\s*-\s*["']?v\*["']?)/.test(projectFile(state, ".github/workflows/release.yml") ?? ""),
      },
      {
        id: "secrets",
        label: "Connexion via docker/login-action et les secrets, sans jeton en clair",
        points: 20,
        hint: "username: ${{ secrets.DOCKERHUB_USERNAME }}, password: ${{ secrets.DOCKERHUB_TOKEN }}",
        check: ({ state }) => {
          const file = projectFile(state, ".github/workflows/release.yml") ?? "";
          return (
            /docker\/login-action@v\d+/.test(file) &&
            /secrets\.DOCKERHUB_TOKEN/.test(file) &&
            /secrets\.DOCKERHUB_USERNAME/.test(file) &&
            !/dckr_pat_/.test(file)
          );
        },
      },
      {
        id: "builders",
        label: "QEMU et Buildx sont configurés",
        points: 10,
        hint: "docker/setup-qemu-action et docker/setup-buildx-action",
        check: ({ state }) =>
          /docker\/setup-qemu-action@v\d+/.test(projectFile(state, ".github/workflows/release.yml") ?? "") &&
          /docker\/setup-buildx-action@v\d+/.test(projectFile(state, ".github/workflows/release.yml") ?? ""),
      },
      {
        id: "metadata",
        label: "Les tags sont générés par docker/metadata-action pour acme/api",
        points: 15,
        hint: "Une étape avec id: meta, uses: docker/metadata-action@v5, with: images: acme/api",
        check: ({ state }) =>
          /docker\/metadata-action@v\d+[\s\S]*images:\s*acme\/api/.test(projectFile(state, ".github/workflows/release.yml") ?? ""),
      },
      {
        id: "build",
        label: "Build multi-plateforme publié avec les tags de metadata",
        points: 25,
        hint: "docker/build-push-action avec push: true, platforms: linux/amd64,linux/arm64, tags: ${{ steps.meta.outputs.tags }}",
        check: ({ state }) => {
          const file = projectFile(state, ".github/workflows/release.yml") ?? "";
          return (
            /docker\/build-push-action@v\d+/.test(file) &&
            /push:\s*true/.test(file) &&
            /platforms:\s*linux\/amd64,\s*linux\/arm64/.test(file) &&
            /tags:\s*\$\{\{\s*steps\.\w+\.outputs\.tags\s*\}\}/.test(file)
          );
        },
      },
      {
        id: "cache",
        label: "Le cache de build GitHub Actions est utilisé",
        points: 10,
        hint: "cache-from: type=gha et cache-to: type=gha,mode=max",
        check: ({ state }) =>
          /cache-from:\s*type=gha/.test(projectFile(state, ".github/workflows/release.yml") ?? "") &&
          /cache-to:\s*type=gha/.test(projectFile(state, ".github/workflows/release.yml") ?? ""),
      },
      {
        id: "local",
        label: "Le Dockerfile a été testé localement (acme/api:ci-test)",
        points: 10,
        hint: "docker build -t acme/api:ci-test .",
        check: ({ state }) => Boolean(image(state, "acme/api:ci-test")),
      },
    ],
    solution: {
      files: {
        ".github/workflows/release.yml": `name: release

on:
  push:
    tags: ["v*"]

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKERHUB_USERNAME }}
          password: \${{ secrets.DOCKERHUB_TOKEN }}

      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: acme/api

      - uses: docker/build-push-action@v6
        with:
          push: true
          platforms: linux/amd64,linux/arm64
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
`,
      },
      commands: ["docker build -t acme/api:ci-test ."],
    },
  },
];

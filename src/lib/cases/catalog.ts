import { API_SOURCE } from "../content/fixtures";
import { PROJECT_DIR } from "../simulator/state";
import { compose, container, diskUsage, dotenv, env, GB, http, image, isRunning, MB, projectFile } from "./checks";
import type { PracticeCase } from "./types";

const MARKETING_SITE = {
  "public/index.html": `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Acme — Bienvenue</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>Acme — Bienvenue</h1>
    <p>Le site vitrine de l'équipe marketing.</p>
  </body>
</html>`,
  "public/style.css": "body { font-family: sans-serif; margin: 4rem; }\n",
};

const API_APP = { requiredEnv: ["DATABASE_URL"], urlEnv: ["DATABASE_URL"], response: "API OK — base connectée" };

const BROKEN_COMPOSE = `services:
  api:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://postgres:\${DB_PASSWORD}@localhost:5432/app
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
`;

const FRONT_FILES = {
  "package.json":
    '{\n  "name": "front",\n  "scripts": { "build": "vite build" },\n  "devDependencies": { "vite": "^5.4.10", "@vitejs/plugin-react": "^4.3.3" },\n  "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" }\n}\n',
  "package-lock.json": '{ "name": "front", "lockfileVersion": 3 }\n',
  "index.html": '<!doctype html>\n<html><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>\n',
  "src/main.jsx":
    'import { createRoot } from "react-dom/client";\nimport App from "./App";\ncreateRoot(document.getElementById("root")).render(<App />);\n',
  "src/App.jsx": "export default function App() {\n  return <h1>Acme — Espace client</h1>;\n}\n",
  Dockerfile: `FROM node:22
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
`,
  ".dockerignore": "node_modules\n.git\n",
};

export const cases: PracticeCase[] = [
  {
    id: "site-vitrine",
    summary: "Servir le site statique de l'équipe marketing avec nginx, en lecture seule et avec redémarrage automatique.",
    title: "Mettre en ligne le site vitrine",
    level: "Débutant",
    duration: "10 min",
    skills: ["docker run", "bind mount", "ports", "restart"],
    moduleIds: ["conteneurs", "volumes-reseaux"],
    brief: `**De :** Julie, responsable marketing
**Objet :** Site vitrine à mettre en ligne

Bonjour,

Le site est prêt, je l'ai déposé dans le dossier \`public/\` du projet. Peux-tu le servir avec **nginx sur le port 8080** du serveur ?

Deux contraintes de l'équipe infra :
- le site doit **revenir tout seul** si le serveur redémarre ;
- le conteneur ne doit **pas pouvoir modifier** nos fichiers.

Merci !`,
    setup: { files: MARKETING_SITE },
    objectives: [
      {
        id: "running",
        label: "Un conteneur nommé site est démarré",
        points: 15,
        hint: "docker run -d --name site …",
        check: ({ state }) => isRunning(state, "site"),
      },
      {
        id: "nginx",
        label: "Il utilise l'image officielle nginx",
        points: 10,
        hint: "L'image s'appelle nginx (ou nginx:alpine, plus légère).",
        check: ({ state }) => /^nginx(:|$)/.test(container(state, "site")?.image ?? ""),
      },
      {
        id: "page",
        label: "http://localhost:8080 affiche la page de l'équipe marketing",
        points: 30,
        hint: "Monte le dossier public/ sur /usr/share/nginx/html et publie 8080 → 80.",
        check: ({ state }) => (http(state, "localhost:8080") ?? "").includes("Acme — Bienvenue"),
      },
      {
        id: "readonly",
        label: "Les fichiers du site sont montés en lecture seule",
        points: 20,
        hint: "Ajoute :ro à la fin du montage -v.",
        check: ({ state }) =>
          Boolean(
            container(state, "site")?.mounts.some(
              (mount) => mount.type === "bind" && mount.source === `${PROJECT_DIR}/public` && mount.readOnly,
            ),
          ),
      },
      {
        id: "restart",
        label: "Le conteneur redémarre automatiquement après un redémarrage du serveur",
        points: 15,
        hint: "Option --restart unless-stopped (ou always).",
        check: ({ state }) => ["always", "unless-stopped"].includes(container(state, "site")?.restart ?? ""),
      },
      {
        id: "clean",
        label: "Aucun conteneur arrêté ou en erreur ne traîne sur le serveur",
        points: 10,
        hint: "docker ps -a, puis docker rm des essais ratés.",
        check: ({ state }) => state.containers.every((candidate) => candidate.status === "running"),
      },
    ],
    solution: {
      commands: ["docker run -d --name site -p 8080:80 --restart unless-stopped -v ./public:/usr/share/nginx/html:ro nginx:alpine"],
    },
  },
  {
    id: "menage-serveur",
    summary: "Disque plein sur le serveur de CI : libérer au moins 2 Go sans toucher au service web ni aux données.",
    title: "Libérer de l'espace sur le serveur de build",
    level: "Débutant",
    duration: "10 min",
    skills: ["system df", "prune", "volumes"],
    moduleIds: ["maintenance"],
    brief: `**De :** Karim, administrateur système
**Objet :** URGENT — disque plein sur build-01

Les builds échouent : plus de place sur le serveur. Libère **au moins 2 Go**.

Attention :
- le conteneur \`web\` sert la page de statut, il doit **continuer à tourner** ;
- la base \`db\` et son volume \`pgdata\` contiennent l'historique des builds : **on n'y touche pas**.`,
    setup: {
      images: ["nginx", "postgres:16", "node:22", "python:3.12", "ubuntu", "redis"],
      danglingImages: 4,
      containers: [
        { name: "web", image: "nginx", ports: ["8080:80"] },
        { name: "db", image: "postgres:16", env: ["POSTGRES_PASSWORD=ci"], volumes: ["pgdata:/var/lib/postgresql/data"] },
        { name: "build-1287", image: "node:22", status: "exited" },
        { name: "build-1288", image: "node:22", status: "exited" },
        { name: "test-runner", image: "python:3.12", status: "exited" },
      ],
      volumes: ["pgdata", "build-cache-old", "tmp-artifacts"],
      buildCache: 1_350_000_000,
    },
    objectives: [
      {
        id: "space",
        label: "Au moins 2 Go ont été libérés",
        points: 40,
        hint: "docker system df pour mesurer, docker system prune -a pour le grand ménage.",
        check: ({ state, initial }) => diskUsage(initial) - diskUsage(state) >= 2 * GB,
      },
      {
        id: "web",
        label: "Le conteneur web tourne toujours",
        points: 20,
        hint: "Ne supprime pas les conteneurs démarrés.",
        check: ({ state }) => isRunning(state, "web"),
      },
      {
        id: "db",
        label: "La base db tourne toujours avec son volume pgdata",
        points: 25,
        hint: "Un volume utilisé par un conteneur n'est jamais supprimé par prune.",
        check: ({ state }) => isRunning(state, "db") && state.volumes.some((volume) => volume.name === "pgdata"),
      },
      {
        id: "stopped",
        label: "Plus aucun conteneur arrêté",
        points: 15,
        hint: "docker container prune",
        check: ({ state }) => state.containers.every((candidate) => candidate.status === "running"),
      },
    ],
    solution: { commands: ["docker system prune -a -f"] },
  },
  {
    id: "dockeriser-api",
    summary: "Conteneuriser une API Node.js en une image légère, non root, sans embarquer de secret.",
    title: "Dockeriser l'API de facturation",
    level: "Intermédiaire",
    duration: "20 min",
    skills: ["Dockerfile", ".dockerignore", "USER", "build"],
    moduleIds: ["dockerfile", "dockeriser", "securite"],
    brief: `**De :** Sophie, lead développeuse
**Objet :** Conteneuriser l'API de facturation

L'API de facturation (Node.js, port 3000) tourne encore « à la main » sur une VM. On veut une image \`api:1.0\` pour la déployer comme les autres services.

Exigences de l'équipe :
- image **légère** : moins de 250 Mo ;
- l'application ne doit **pas tourner en root** ;
- ni le dossier \`node_modules\` de ton poste, ni le fichier \`.env\` (il contient la clé Stripe de production !) ne doivent se retrouver dans l'image ;
- lance un conteneur \`api\` sur le port 3000 pour qu'on puisse tester.`,
    setup: {
      files: {
        "package.json": API_SOURCE["package.json"],
        "package-lock.json": API_SOURCE["package-lock.json"],
        "server.js":
          'const express = require("express");\nconst app = express();\napp.get("/", (req, res) => res.send("API facturation OK"));\napp.listen(3000, () => console.log("Server listening on http://0.0.0.0:3000"));\n',
        ".env": "STRIPE_SECRET_KEY=sk_live_51HxQkF2eZvKYlo2C\n",
        "node_modules/express/package.json": '{ "name": "express", "version": "4.21.1" }\n',
      },
      app: { response: "API facturation OK" },
    },
    objectives: [
      {
        id: "dockerfile",
        label: "Un Dockerfile existe à la racine du projet",
        points: 10,
        hint: "Crée le fichier Dockerfile dans l'explorateur.",
        check: ({ state }) => projectFile(state, "Dockerfile") !== undefined,
      },
      {
        id: "image",
        label: "L'image api:1.0 existe",
        points: 15,
        hint: "docker build -t api:1.0 .",
        check: ({ state }) => Boolean(image(state, "api:1.0")),
      },
      {
        id: "size",
        label: "L'image pèse moins de 250 Mo",
        points: 15,
        hint: "Pars de node:22-alpine plutôt que node:22.",
        check: ({ state }) => (image(state, "api:1.0")?.size ?? Infinity) < 250 * MB,
      },
      {
        id: "user",
        label: "L'application ne tourne pas en root",
        points: 15,
        hint: "L'image node fournit déjà l'utilisateur node : instruction USER.",
        check: ({ state }) => {
          const user = image(state, "api:1.0")?.user;
          return Boolean(user) && user !== "root" && user !== "0";
        },
      },
      {
        id: "ignore",
        label: "Ni node_modules local ni .env ne sont copiés dans l'image",
        points: 15,
        hint: "Un fichier .dockerignore à la racine exclut des fichiers du contexte de build.",
        check: ({ state }) => {
          const built = image(state, "api:1.0");
          return Boolean(built) && !Object.keys(built!.fs).some((path) => path.includes("node_modules") || path.endsWith("/.env"));
        },
      },
      {
        id: "run",
        label: "Un conteneur api lancé depuis api:1.0 répond sur http://localhost:3000",
        points: 30,
        hint: "docker run -d --name api -p 3000:3000 api:1.0",
        check: ({ state }) => container(state, "api")?.image === "api:1.0" && http(state, "localhost:3000") === "API facturation OK",
      },
    ],
    solution: {
      files: {
        Dockerfile:
          'FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nUSER node\nEXPOSE 3000\nCMD ["node", "server.js"]\n',
        ".dockerignore": "node_modules\n.env\n.git\n",
      },
      commands: ["docker build -t api:1.0 .", "docker run -d --name api -p 3000:3000 api:1.0"],
    },
  },
  {
    id: "stack-compose",
    summary: "Lancer l'API et sa base Postgres en une commande, sans mot de passe versionné et avec un démarrage fiable.",
    title: "Monter l'environnement de développement",
    level: "Intermédiaire",
    duration: "25 min",
    skills: ["compose.yaml", ".env", "healthcheck", "volumes"],
    moduleIds: ["compose", "configuration", "compose-equipe"],
    brief: `**De :** Sophie, lead développeuse
**Objet :** Onboarding en une commande

Trois nouveaux développeurs arrivent lundi. Je veux qu'ils puissent lancer **l'API et sa base Postgres avec une seule commande**.

Le Dockerfile de l'API est déjà dans le projet. L'API lit \`DATABASE_URL\` et écoute sur le port 3000.

Exigences :
- un \`compose.yaml\` avec les services \`api\` et \`db\` (postgres:16) ;
- **aucun mot de passe dans compose.yaml** : il est versionné. Utilise un \`.env\` (un modèle \`.env.example\` existe) ;
- les données de Postgres dans un **volume nommé** ;
- l'API ne démarre que lorsque la base est **prête** (pas seulement lancée).

Laisse la stack démarrée pour que je vérifie.`,
    setup: { files: { ...API_SOURCE, ".env.example": "DB_PASSWORD=changeme\n" }, app: API_APP },
    objectives: [
      {
        id: "services",
        label: "compose.yaml est valide et décrit les services api et db",
        points: 10,
        hint: "Deux entrées sous services:, et docker compose config pour vérifier.",
        check: ({ state }) => {
          const project = compose(state);
          return Boolean(
            project?.services.some((service) => service.name === "api") && project.services.some((service) => service.name === "db"),
          );
        },
      },
      {
        id: "secret",
        label: "Aucun mot de passe en clair dans compose.yaml",
        points: 15,
        hint: "Remplace la valeur par ${DB_PASSWORD} et mets-la dans .env.",
        check: ({ state }) => {
          const file = projectFile(state, "compose.yaml") ?? "";
          const password = dotenv(state).DB_PASSWORD;
          return file.includes("${") && Boolean(password) && !file.includes(password) && !/PASSWORD:\s*["']?[^\s$"'][^\s]*/.test(file);
        },
      },
      {
        id: "up",
        label: "La stack est démarrée : api et db tournent",
        points: 20,
        hint: "docker compose up -d --build",
        check: ({ state }) => isRunning(state, "api") && isRunning(state, "db"),
      },
      {
        id: "healthy",
        label: "La base a un healthcheck et l'API attend qu'elle soit « healthy »",
        points: 15,
        hint: "healthcheck avec pg_isready côté db, depends_on … condition: service_healthy côté api.",
        check: ({ state }) => {
          const project = compose(state);
          const db = project?.services.find((service) => service.name === "db");
          const api = project?.services.find((service) => service.name === "api");
          return Boolean(
            db?.healthcheck &&
            api?.dependsOn.some((dependency) => dependency.service === "db" && dependency.condition === "service_healthy"),
          );
        },
      },
      {
        id: "volume",
        label: "Les données Postgres sont stockées dans un volume nommé",
        points: 15,
        hint: "volumes: - pgdata:/var/lib/postgresql/data, et pgdata déclaré en bas du fichier.",
        check: ({ state }) =>
          Boolean(
            container(state, "db")?.mounts.some(
              (mount) => mount.type === "volume" && mount.target === "/var/lib/postgresql/data" && !/^[0-9a-f]{64}$/.test(mount.source),
            ),
          ),
      },
      {
        id: "http",
        label: "L'API répond sur http://localhost:3000",
        points: 25,
        hint: "Vérifie DATABASE_URL : hôte db, même mot de passe que la base. docker compose logs api en cas de doute.",
        check: ({ state }) => http(state, "localhost:3000") === API_APP.response,
      },
    ],
    solution: {
      files: {
        ".env": "DB_PASSWORD=s3cret\n",
        "compose.yaml": `services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:\${DB_PASSWORD}@db:5432/app
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`,
      },
      commands: ["docker compose up -d --build"],
    },
  },
  {
    id: "publier-release",
    summary: "Publier la 2.1.0 dans l'organisation acme sur Docker Hub, pour amd64 et arm64, sans casser la 2.0.0.",
    title: "Publier la release 2.1.0",
    level: "Intermédiaire",
    duration: "15 min",
    skills: ["docker login", "organisation", "tags", "buildx"],
    moduleIds: ["docker-hub", "hub-equipe"],
    brief: `**De :** Thomas, responsable des releases
**Objet :** Release 2.1.0 de l'API

La 2.1.0 est validée. Publie-la sur Docker Hub dans l'organisation **acme** (dépôt \`acme/api\`), avec les tags \`2.1.0\`, \`2.1\` et \`latest\`.

Rappels :
- une partie de l'équipe est sur Mac Apple Silicon : l'image doit exister pour **linux/amd64 et linux/arm64** ;
- on ne publie **rien** dans les comptes personnels ;
- la 2.0.0 est encore en production chez des clients : **ne la touche pas**.

Tu n'es pas encore connecté à Docker Hub sur ce poste (identifiant : alex).`,
    setup: { files: { ...API_SOURCE }, orgs: ["acme"], hub: { "acme/api": { private: true, tags: ["2.0.0", "2.0", "latest"] } } },
    objectives: [
      { id: "login", label: "Tu es connecté à Docker Hub", points: 10, hint: "docker login", check: ({ state }) => state.auth !== null },
      {
        id: "release",
        label: "acme/api:2.1.0 est publiée",
        points: 20,
        hint: "Construis avec -t acme/api:2.1.0 puis publie (--push ou docker push).",
        check: ({ state }) => Boolean(state.hub["acme/api"]?.tags["2.1.0"]),
      },
      {
        id: "tags",
        label: "Les tags 2.1 et latest pointent vers cette même release",
        points: 20,
        hint: "Plusieurs -t dans la même commande de build, ou docker tag puis docker push --all-tags.",
        check: ({ state }) => {
          const tags = state.hub["acme/api"]?.tags;
          const key = tags?.["2.1.0"]?.image?.buildKey;
          return Boolean(key) && tags!["2.1"]?.image?.buildKey === key && tags!.latest?.image?.buildKey === key;
        },
      },
      {
        id: "platforms",
        label: "Les trois tags existent pour linux/amd64 et linux/arm64",
        points: 30,
        hint: "docker buildx build --platform linux/amd64,linux/arm64 … --push .",
        check: ({ state }) =>
          ["2.1.0", "2.1", "latest"].every((tag) => {
            const platforms = state.hub["acme/api"]?.tags[tag]?.platforms ?? [];
            return platforms.includes("linux/amd64") && platforms.includes("linux/arm64");
          }),
      },
      {
        id: "personal",
        label: "Rien n'a été publié dans un compte personnel",
        points: 10,
        hint: "Le dépôt doit commencer par acme/.",
        check: ({ state }) => Object.keys(state.hub).every((repo) => repo.startsWith("acme/")),
      },
      {
        id: "previous",
        label: "La version 2.0.0 est intacte",
        points: 10,
        hint: "Ne republie jamais un tag de version existant.",
        check: ({ state, initial }) => state.hub["acme/api"]?.tags["2.0.0"]?.pushedAt === initial.hub["acme/api"]?.tags["2.0.0"]?.pushedAt,
      },
    ],
    solution: {
      commands: [
        "docker login",
        "docker buildx build --platform linux/amd64,linux/arm64 -t acme/api:2.1.0 -t acme/api:2.1 -t acme/api:latest --push .",
      ],
    },
  },
  {
    id: "incident-prod",
    summary: "L'API redémarre en boucle depuis le dernier déploiement : diagnostiquer, corriger et ne perdre aucune donnée.",
    title: "Incident : l'API redémarre en boucle",
    level: "Avancé",
    duration: "20 min",
    skills: ["diagnostic", "logs", "compose", "réseau"],
    moduleIds: ["compose", "debug"],
    brief: `**Alerte de supervision — recette**
**Service :** api — état \`Restarting\` depuis 23 h 14

Depuis le déploiement d'hier soir, l'API de recette redémarre en boucle. La stack est gérée avec Docker Compose dans \`~/projet\`.

Ta mission :
- trouve la **cause** ;
- corrige-la **dans la configuration** (pas de rustine manuelle sur le conteneur) ;
- remets le service en route.

⚠ La base contient les données de recette des clients : elles **ne doivent pas être perdues**.`,
    setup: {
      files: { ...API_SOURCE, "compose.yaml": BROKEN_COMPOSE, ".env": "DB_PASSWORD=r3cette\n" },
      app: API_APP,
      commands: ["docker compose up -d"],
    },
    objectives: [
      {
        id: "stable",
        label: "L'API tourne de façon stable (plus de redémarrage en boucle)",
        points: 25,
        hint: "docker compose ps, puis docker compose logs api.",
        check: ({ state }) => isRunning(state, "api"),
      },
      {
        id: "http",
        label: "L'API répond sur http://localhost:3000",
        points: 25,
        hint: "Après correction : docker compose up -d recrée le service modifié.",
        check: ({ state }) => http(state, "localhost:3000") === API_APP.response,
      },
      {
        id: "config",
        label: "La correction est dans compose.yaml : l'API joint la base par le nom du service",
        points: 20,
        hint: "Dans un conteneur, localhost désigne le conteneur lui-même.",
        check: ({ state }) => {
          const api = compose(state)?.services.find((service) => service.name === "api");
          const url = api?.env.find((entry) => entry.startsWith("DATABASE_URL="))?.slice(13) ?? "";
          return /@db:5432\//.test(url) && env(container(state, "api"), "DATABASE_URL") === url;
        },
      },
      {
        id: "data",
        label: "Le volume de données projet_pgdata n'a pas été supprimé",
        points: 30,
        hint: "docker compose down -v supprime les volumes : à éviter ici.",
        check: ({ state, initial }) => {
          const before = initial.volumes.find((volume) => volume.name === "projet_pgdata");
          const after = state.volumes.find((volume) => volume.name === "projet_pgdata");
          return Boolean(before && after && before.createdAt === after.createdAt);
        },
      },
    ],
    solution: { files: { "compose.yaml": BROKEN_COMPOSE.replace("@localhost:5432", "@db:5432") }, commands: ["docker compose up -d"] },
  },
  {
    id: "image-front",
    summary: "Faire passer l'image du front React de 1,2 Go à moins de 100 Mo grâce à un build multi-étapes.",
    title: "Optimiser l'image du front-end",
    level: "Avancé",
    duration: "25 min",
    skills: ["multi-stage", "nginx", "optimisation"],
    moduleIds: ["dockerfile", "securite"],
    brief: `**De :** Sophie, lead développeuse
**Objet :** L'image du front pèse 1,2 Go

L'image actuelle du front-end React embarque Node.js, les sources et toutes les dépendances de build, alors qu'au final on ne sert que des fichiers statiques.

Objectif :
- une image \`front:2.0\` de **moins de 100 Mo**, servie par **nginx** ;
- le build se fait toujours dans Docker (\`npm ci && npm run build\`, résultat dans \`dist/\`) ;
- n'utilise plus l'image \`node:22\` complète, même pour l'étape de build ;
- lance un conteneur \`front\` sur le port 8080 pour validation.`,
    setup: {
      files: FRONT_FILES,
      customImages: [{ ref: "front:1.0", base: "node:22", size: 1_240_000_000, cmd: ["npx", "serve", "-s", "dist", "-l", "3000"] }],
    },
    objectives: [
      {
        id: "image",
        label: "L'image front:2.0 existe",
        points: 15,
        hint: "docker build -t front:2.0 .",
        check: ({ state }) => Boolean(image(state, "front:2.0")),
      },
      {
        id: "size",
        label: "Elle pèse moins de 100 Mo",
        points: 25,
        hint: "L'image finale ne doit contenir que nginx et le dossier dist.",
        check: ({ state }) => (image(state, "front:2.0")?.size ?? Infinity) < 100 * MB,
      },
      {
        id: "multistage",
        label: "Le build se fait en plusieurs étapes et l'image finale est servie par nginx",
        points: 20,
        hint: "FROM … AS build, puis FROM nginx:alpine et COPY --from=build /app/dist /usr/share/nginx/html.",
        check: ({ state }) =>
          image(state, "front:2.0")?.kind === "nginx" && ((projectFile(state, "Dockerfile") ?? "").match(/^FROM\s/gim)?.length ?? 0) >= 2,
      },
      {
        id: "light-build",
        label: "Plus aucune étape n'utilise l'image node:22 complète",
        points: 15,
        hint: "node:22-alpine convient très bien pour builder.",
        check: ({ state }) => !/^FROM\s+node:22(\s|$)/im.test(projectFile(state, "Dockerfile") ?? ""),
      },
      {
        id: "serve",
        label: "Un conteneur front répond sur http://localhost:8080",
        points: 25,
        hint: "nginx écoute sur le port 80 dans le conteneur.",
        check: ({ state }) =>
          container(state, "front")?.image === "front:2.0" && (http(state, "localhost:8080") ?? "").includes('id="root"'),
      },
    ],
    solution: {
      files: {
        Dockerfile: `FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
`,
      },
      commands: ["docker build -t front:2.0 .", "docker run -d --name front -p 8080:80 front:2.0"],
    },
  },
];

export function getCase(caseId: string): PracticeCase | undefined {
  return cases.find((practice) => practice.id === caseId);
}

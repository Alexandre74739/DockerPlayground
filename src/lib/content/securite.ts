import type { Module } from "../types";
import { API_SOURCE } from "./fixtures";

const run = [
  ["docker", "run"],
  ["docker", "container", "run"],
];

const SECURE_DOCKERFILE = `# Étape 1 : installation des dépendances de production
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Étape 2 : image finale minimale
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER node
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://localhost:3000/ || exit 1
CMD ["node", "server.js"]
`;

export const securite: Module = {
  id: "securite",
  title: "Sécurité et optimisation",
  description: "Images légères, utilisateur non root, scan de vulnérabilités et limites de ressources.",
  icon: "shield",
  videos: [
    { youtubeId: "VMzgt1434c8", title: "Pratiques de sécurité", author: "xavki", duration: "8:31", lang: "fr" },
    { youtubeId: "Cnw5BeEj1HA", title: "Le build multistage", author: "xavki", duration: "26:01", lang: "fr" },
    {
      youtubeId: "0Wc4-_DownU",
      title: "Find Vulnerabilities Fast with Docker Scout",
      author: "DevOps Directive",
      duration: "10:39",
      lang: "en",
    },
  ],
  resources: [
    {
      title: "Sécurité de Docker Engine",
      url: "https://docs.docker.com/engine/security/",
      kind: "doc",
      lang: "en",
      description: "Isolation, capacités du noyau, mode rootless.",
    },
    {
      title: "Docker Scout",
      url: "https://docs.docker.com/scout/",
      kind: "doc",
      lang: "en",
      description: "Analyser les vulnérabilités et les dépendances de ses images.",
    },
    {
      title: "Limiter les ressources",
      url: "https://docs.docker.com/engine/containers/resource_constraints/",
      kind: "doc",
      lang: "en",
      description: "Mémoire, CPU : éviter qu'un conteneur ne mette le serveur à genoux.",
    },
    {
      title: "OWASP Docker Security Cheat Sheet",
      url: "https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html",
      kind: "article",
      lang: "en",
      description: "La liste de contrôle de référence en sécurité des conteneurs.",
    },
    {
      title: "Bonnes pratiques de build",
      url: "https://docs.docker.com/build/building/best-practices/",
      kind: "doc",
      lang: "en",
      description: "Choix de l'image de base, couches, multi-étapes, épinglage des versions.",
    },
  ],
  exercises: [
    {
      id: "dockerfile-securise",
      kind: "file",
      title: "Un Dockerfile prêt pour la production",
      intro:
        "Une image de production doit être **petite** (moins de paquets = moins de failles), tourner **sans root**, ne contenir **aucun secret** et signaler son état de santé.",
      fileName: "Dockerfile",
      instruction:
        "Réécris ce Dockerfile : étape deps (node:22-alpine) qui installe les dépendances de production avec npm ci --omit=dev, puis image finale node:22-alpine qui copie node_modules depuis deps, s'exécute en tant qu'utilisateur node et déclare un HEALTHCHECK. Supprime le jeton écrit en dur.",
      starter: `FROM node:22
ENV NPM_TOKEN=npm_9f8e7d6c5b4a
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"]
`,
      checks: [
        { pattern: /^FROM\s+node:22-alpine\s+AS\s+deps\s*$/im, label: "Étape deps en node:22-alpine" },
        { pattern: /^RUN\s+npm\s+ci\s+--omit=dev\s*$/im, label: "RUN npm ci --omit=dev" },
        { pattern: /^FROM\s+node:22-alpine\s*$/im, label: "Image finale node:22-alpine" },
        {
          pattern: /^COPY\s+--from=deps\s+\/app\/node_modules\s+(\.\/node_modules|\/app\/node_modules)\/?\s*$/im,
          label: "COPY --from=deps …/node_modules",
        },
        { pattern: /^USER\s+node\s*$/im, label: "USER node" },
        { pattern: /^HEALTHCHECK\s+/im, label: "HEALTHCHECK déclaré" },
        { pattern: /NPM_TOKEN|npm_9f8e/i, label: "Aucun jeton dans l'image", absent: true },
        { pattern: /^FROM\s+node:22\s*$/im, label: "Plus d'image node:22 complète", absent: true },
      ],
      solution: SECURE_DOCKERFILE,
    },
    {
      id: "scanner",
      kind: "command",
      title: "Scanner et alléger une image",
      intro:
        "`docker scout` analyse les paquets d'une image et compte les vulnérabilités connues. L'équipe utilise encore une image basée sur node:22 (Debian complet) : compare-la avec une version Alpine.",
      setup: {
        customImages: [{ ref: "api:lourde", base: "node:22", size: 1_160_000_000 }],
        files: { ...API_SOURCE },
      },
      steps: [
        {
          instruction: "Affiche le résumé des vulnérabilités de api:lourde.",
          rule: {
            prefixes: [
              ["docker", "scout", "quickview"],
              ["docker", "scout", "qv"],
            ],
            args: ["api:lourde"],
          },
          solution: "docker scout quickview api:lourde",
          hint: "docker scout quickview <image>",
        },
        {
          instruction: "Demande à Docker Scout ses recommandations d'image de base.",
          rule: { prefixes: [["docker", "scout", "recommendations"]], args: ["api:lourde"] },
          solution: "docker scout recommendations api:lourde",
          hint: "docker scout recommendations <image>",
        },
        {
          instruction: "Le Dockerfile du projet utilise déjà node:22-alpine : construis l'image api:legere.",
          rule: {
            prefixes: [
              ["docker", "build"],
              ["docker", "buildx", "build"],
            ],
            flags: [{ names: ["-t", "--tag"], value: "api:legere" }],
            args: ["."],
          },
          solution: "docker build -t api:legere .",
          hint: "docker build -t <nom:tag> .",
        },
        {
          instruction: "Compare la taille des deux images du dépôt api.",
          rule: {
            prefixes: [
              ["docker", "images"],
              ["docker", "image", "ls"],
            ],
            args: ["api"],
          },
          solution: "docker images api",
          hint: "docker images <dépôt> filtre la liste.",
        },
        {
          instruction: "Analyse à son tour api:legere.",
          rule: {
            prefixes: [
              ["docker", "scout", "quickview"],
              ["docker", "scout", "qv"],
            ],
            args: ["api:legere"],
          },
          solution: "docker scout quickview api:legere",
          hint: "Même commande qu'à l'étape 1.",
        },
      ],
    },
    {
      id: "limiter",
      kind: "command",
      title: "Limiter un conteneur",
      intro:
        "Par défaut un conteneur peut consommer toute la mémoire et tout le CPU de la machine, et écrire partout dans son système de fichiers. En production, on borne tout cela.",
      setup: { customImages: [{ ref: "api:1.0", base: "node:22-alpine", user: "node" }] },
      steps: [
        {
          instruction:
            "Lance api:1.0 nommée api, en arrière-plan, avec 256 Mo de mémoire, un demi-CPU et un système de fichiers en lecture seule.",
          rule: {
            prefixes: run,
            flags: [
              { names: ["-d", "--detach"] },
              { names: ["--name"], value: "api" },
              { names: ["-m", "--memory"], value: "256m" },
              { names: ["--cpus"], value: "0.5" },
              { names: ["--read-only"] },
            ],
            args: ["api:1.0"],
          },
          solution: "docker run -d --name api --memory 256m --cpus 0.5 --read-only api:1.0",
          hint: "Options --memory, --cpus et --read-only",
        },
        {
          instruction: "Vérifie la limite mémoire dans les statistiques (sans flux continu).",
          rule: {
            prefixes: [
              ["docker", "stats"],
              ["docker", "container", "stats"],
            ],
            flags: [{ names: ["--no-stream"] }],
          },
          solution: "docker stats --no-stream",
          hint: "--no-stream affiche une seule mesure.",
        },
        {
          instruction: "Tente de créer le fichier /app/test dans le conteneur : l'écriture doit être refusée.",
          rule: {
            prefixes: [
              ["docker", "exec"],
              ["docker", "container", "exec"],
            ],
            args: ["api", "touch", "/app/test"],
          },
          solution: "docker exec api touch /app/test",
          hint: "docker exec <conteneur> touch <fichier>",
          expect: "failure",
        },
        {
          instruction: "Vérifie avec quel utilisateur tourne le processus.",
          rule: {
            prefixes: [
              ["docker", "exec"],
              ["docker", "container", "exec"],
            ],
            args: ["api", "whoami"],
          },
          solution: "docker exec api whoami",
          hint: "La commande whoami affiche l'utilisateur courant.",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Pourquoi ne pas exécuter l'application en root dans le conteneur ?",
      choices: [
        "C'est plus lent",
        "En cas de faille dans l'application, l'attaquant obtient les droits root dans le conteneur, ce qui facilite une évasion",
        "Docker l'interdit",
        "Les ports ne fonctionnent pas",
      ],
      answer: 1,
      explanation: "Le principe du moindre privilège : `USER node` (ou un utilisateur créé) limite fortement l'impact d'une compromission.",
    },
    {
      question: "Quel est l'effet principal d'une image de base Alpine ou slim ?",
      choices: [
        "Plus de fonctionnalités",
        "Moins de paquets : image plus légère et beaucoup moins de vulnérabilités",
        "Compatibilité Windows",
        "Démarrage en mode root",
      ],
      answer: 1,
      explanation: "Chaque paquet installé est une surface d'attaque potentielle. Moins il y en a, mieux c'est.",
    },
    {
      question: "Que fait `--read-only` ?",
      choices: [
        "Interdit les connexions réseau",
        "Monte le système de fichiers du conteneur en lecture seule",
        "Empêche docker exec",
        "Rend l'image non modifiable sur Docker Hub",
      ],
      answer: 1,
      explanation:
        "Un attaquant ne peut plus déposer de fichiers. Les dossiers qui doivent rester inscriptibles passent par un volume ou `--tmpfs`.",
    },
    {
      question: "Que mesure `docker scout quickview` ?",
      choices: [
        "La vitesse de l'image",
        "Les vulnérabilités connues (CVE) des paquets, par niveau de gravité",
        "Le nombre de téléchargements",
        "La consommation mémoire",
      ],
      answer: 1,
      explanation: "C = critique, H = haute, M = moyenne, L = faible. Les recommandations proposent une image de base plus sûre.",
    },
    {
      question: "Pourquoi épingler une version (`node:22.11-alpine` plutôt que `node:latest`) ?",
      choices: [
        "Pour télécharger plus vite",
        "Pour des builds reproductibles : la même recette produit la même image",
        "C'est obligatoire",
        "Pour éviter docker scout",
      ],
      answer: 1,
      explanation: "`latest` change sans prévenir. On met à jour volontairement, en testant, plutôt que de subir.",
    },
  ],
};

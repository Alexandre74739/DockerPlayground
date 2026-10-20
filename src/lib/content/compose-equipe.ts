import type { Module } from "../types";
import { API_SOURCE } from "./fixtures";

const BASE_COMPOSE = `services:
  api:
    build: .
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
      interval: 5s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`;

const OVERRIDE = `# Chargé automatiquement en local : confort de développement
services:
  api:
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
`;

const PROD = `# Production : docker compose -f compose.yaml -f compose.prod.yaml up -d
services:
  api:
    image: acme/api:\${TAG:-latest}
    ports:
      - "80:3000"
    restart: unless-stopped
    environment:
      NODE_ENV: production
  db:
    restart: unless-stopped
`;

const PROFILES = `services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"

  adminer:
    image: nginx:alpine
    profiles: [tools]
    ports:
      - "8081:80"
`;

const app = { requiredEnv: ["DATABASE_URL"], urlEnv: ["DATABASE_URL"] };

export const composeEquipe: Module = {
  id: "compose-equipe",
  title: "Compose en équipe",
  description: "Healthchecks, ordre de démarrage, fichiers par environnement et profils.",
  icon: "users",
  videos: [
    { youtubeId: "-pOjsd0yi8Y", title: "compose.yml et compose.override.yml", author: "Nicely Dev", duration: "5:53", lang: "fr" },
    {
      youtubeId: "jGePPQFArwo",
      title: "A Docker Compose Override File Can Help Avoid Duplication",
      author: "Nick Janetakis",
      duration: "8:39",
      lang: "en",
    },
    {
      youtubeId: "wSODnwNYglU",
      title: "Stop Struggling with Docker Compose – 10 Tricks",
      author: "VirtualizationHowto",
      duration: "16:43",
      lang: "en",
    },
  ],
  resources: [
    {
      title: "Contrôler l'ordre de démarrage",
      url: "https://docs.docker.com/compose/how-tos/startup-order/",
      kind: "doc",
      lang: "en",
      description: "depends_on, conditions et healthchecks.",
    },
    {
      title: "Fusionner plusieurs fichiers Compose",
      url: "https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/",
      kind: "doc",
      lang: "en",
      description: "compose.override.yaml et -f pour adapter la configuration à chaque environnement.",
    },
    {
      title: "Profils",
      url: "https://docs.docker.com/compose/how-tos/profiles/",
      kind: "doc",
      lang: "en",
      description: "Activer des services optionnels (outils, monitoring…) à la demande.",
    },
    {
      title: "Compose Watch",
      url: "https://docs.docker.com/compose/how-tos/file-watch/",
      kind: "doc",
      lang: "en",
      description: "Synchroniser le code et reconstruire automatiquement en développement.",
    },
    {
      title: "Référence des services",
      url: "https://docs.docker.com/reference/compose-file/services/",
      kind: "doc",
      lang: "en",
      description: "Toutes les clés d'un service : healthcheck, restart, deploy…",
    },
  ],
  exercises: [
    {
      id: "healthcheck",
      kind: "file",
      title: "Attendre que la base soit prête",
      intro:
        "`depends_on` seul ne garantit que l'ordre de démarrage : l'API peut démarrer avant que Postgres accepte les connexions. Avec un `healthcheck` sur la base et `condition: service_healthy`, Compose attend qu'elle soit vraiment prête.",
      fileName: "compose.yaml",
      instruction:
        "Ajoute à db un healthcheck qui exécute pg_isready -U postgres, et fais dépendre api de db avec la condition service_healthy. Ajoute aussi restart: unless-stopped à l'API.",
      starter: `services:
  api:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: \${DB_PASSWORD}
`,
      checks: [
        { pattern: /^ {4}healthcheck:\s*\n\s+test:.*pg_isready.*$/m, label: "db : healthcheck avec pg_isready" },
        {
          pattern: /^ {4}depends_on:\s*\n {6}db:\s*\n {8}condition:\s*service_healthy\s*$/m,
          label: "api : depends_on db → service_healthy",
        },
        { pattern: /^ {4}restart:\s*unless-stopped\s*$/m, label: "api : restart: unless-stopped" },
      ],
      solution: `services:
  api:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5
`,
    },
    {
      id: "environnements",
      kind: "command",
      title: "Un projet, plusieurs environnements",
      intro:
        "Le `compose.yaml` décrit ce qui est commun. `compose.override.yaml` est fusionné **automatiquement** en local ; pour la production, on désigne explicitement les fichiers avec `-f`.",
      setup: {
        files: {
          ...API_SOURCE,
          "compose.yaml": BASE_COMPOSE,
          "compose.override.yaml": OVERRIDE,
          "compose.prod.yaml": PROD,
          ".env": "DB_PASSWORD=s3cret\nTAG=1.4.2\n",
        },
        hub: { "acme/api": { tags: ["1.4.2", "latest"] } },
        app,
      },
      steps: [
        {
          instruction: "Affiche la configuration de développement (compose.yaml + override chargés automatiquement).",
          rule: { prefixes: [["docker", "compose", "config"]] },
          solution: "docker compose config",
          hint: "docker compose config",
        },
        {
          instruction: "Affiche maintenant la configuration de production : compose.yaml puis compose.prod.yaml.",
          rule: {
            prefixes: [["docker", "compose", "-f", "compose.yaml", "-f", "compose.prod.yaml", "config"]],
          },
          solution: "docker compose -f compose.yaml -f compose.prod.yaml config",
          hint: "L'option -f se répète, dans l'ordre de fusion, avant la sous-commande.",
        },
        {
          instruction: "Démarre la stack de production en arrière-plan.",
          rule: {
            prefixes: [["docker", "compose", "-f", "compose.yaml", "-f", "compose.prod.yaml", "up"]],
            flags: [{ names: ["-d", "--detach"] }],
          },
          solution: "docker compose -f compose.yaml -f compose.prod.yaml up -d",
          hint: "Mêmes options -f, avec up -d.",
        },
        {
          instruction: "Vérifie l'état des services (la base doit être healthy).",
          rule: {
            prefixes: [
              ["docker", "compose", "-f", "compose.yaml", "-f", "compose.prod.yaml", "ps"],
              ["docker", "compose", "ps"],
              ["docker", "ps"],
            ],
          },
          solution: "docker compose -f compose.yaml -f compose.prod.yaml ps",
          hint: "docker compose … ps",
        },
        {
          instruction: "Vérifie que l'API répond sur le port 80.",
          rule: {
            prefixes: [
              ["curl", "localhost"],
              ["curl", "localhost:80"],
              ["curl", "http://localhost"],
              ["curl", "http://localhost:80"],
              ["curl", "localhost/"],
              ["curl", "http://localhost/"],
            ],
          },
          solution: "curl localhost",
          hint: "Le port 80 est le port HTTP par défaut.",
        },
      ],
    },
    {
      id: "profils",
      kind: "command",
      title: "Des services à la demande avec les profils",
      intro:
        "Un service avec `profiles: [tools]` n'est démarré que si le profil est activé. Idéal pour les outils d'administration, de debug ou de monitoring que tout le monde n'utilise pas.",
      setup: { files: { "compose.yaml": PROFILES }, images: ["nginx:alpine"] },
      steps: [
        {
          instruction: "Démarre la stack en arrière-plan, sans profil.",
          rule: { prefixes: [["docker", "compose", "up"]], flags: [{ names: ["-d", "--detach"] }] },
          solution: "docker compose up -d",
          hint: "docker compose up -d",
        },
        {
          instruction: "Liste les services démarrés : adminer n'en fait pas partie.",
          rule: { prefixes: [["docker", "compose", "ps"]] },
          solution: "docker compose ps",
          hint: "docker compose ps",
        },
        {
          instruction: "Démarre la stack avec le profil tools.",
          rule: { prefixes: [["docker", "compose", "--profile", "tools", "up"]], flags: [{ names: ["-d", "--detach"] }] },
          solution: "docker compose --profile tools up -d",
          hint: "--profile se place avant la sous-commande.",
        },
        {
          instruction: "Vérifie que l'outil répond sur le port 8081.",
          rule: {
            prefixes: [
              ["curl", "localhost:8081"],
              ["curl", "http://localhost:8081"],
              ["curl", "localhost:8081/"],
              ["curl", "http://localhost:8081/"],
            ],
          },
          solution: "curl localhost:8081",
          hint: "curl localhost:8081",
        },
        {
          instruction: "Arrête et supprime toute la stack, profil tools compris.",
          rule: { prefixes: [["docker", "compose", "--profile", "tools", "down"]] },
          solution: "docker compose --profile tools down",
          hint: "Même profil, avec down.",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Que garantit `condition: service_healthy` ?",
      choices: [
        "Que le service dépendant redémarre en cas d'erreur",
        "Que la dépendance a passé son healthcheck avant le démarrage du service",
        "Que les deux services sont sur le même réseau",
        "Rien de plus que depends_on simple",
      ],
      answer: 1,
      explanation: "Sans healthcheck déclaré sur la dépendance, Compose refuse d'ailleurs cette condition.",
    },
    {
      question: "Quand `compose.override.yaml` est-il pris en compte ?",
      choices: [
        "Jamais automatiquement",
        "Automatiquement, si aucun -f n'est précisé",
        "Seulement avec --profile",
        "Uniquement en production",
      ],
      answer: 1,
      explanation:
        "Avec `-f`, seuls les fichiers listés sont lus : c'est ce qui permet d'avoir une configuration de production différente.",
    },
    {
      question: "Dans `-f compose.yaml -f compose.prod.yaml`, quel fichier l'emporte en cas de conflit ?",
      choices: ["compose.yaml", "compose.prod.yaml, le dernier de la liste", "Aucun, c'est une erreur", "Le plus récent sur le disque"],
      answer: 1,
      explanation: "Les fichiers sont fusionnés dans l'ordre : les valeurs scalaires du dernier remplacent les précédentes.",
    },
    {
      question: "À quoi sert `restart: unless-stopped` ?",
      choices: [
        "À ne jamais redémarrer",
        "À redémarrer le conteneur s'il s'arrête (crash, reboot), sauf s'il a été arrêté volontairement",
        "À redémarrer toutes les heures",
        "À reconstruire l'image",
      ],
      answer: 1,
      explanation:
        "C'est la politique la plus courante en production. Attention : un conteneur qui plante en boucle apparaît « Restarting ».",
    },
    {
      question: "Un collègue n'a pas besoin de l'outil d'administration. Comment l'exclure sans maintenir deux fichiers ?",
      choices: [
        "Le commenter dans compose.yaml",
        "Lui attribuer un profil (profiles: [tools])",
        "Le supprimer à chaque fois",
        "Utiliser -p",
      ],
      answer: 1,
      explanation: "Les services sans profil démarrent toujours ; les autres seulement avec `--profile`.",
    },
  ],
};

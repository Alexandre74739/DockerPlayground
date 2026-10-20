import type { Module } from "../types";
import { COMPOSE_FILE, PROJECT_FILES } from "./fixtures";

const compose = (...rest: string[]) => [
  ["docker", "compose", ...rest],
  ["docker-compose", ...rest],
];

export const composeModule: Module = {
  id: "compose",
  title: "Docker Compose",
  description: "Décrire et piloter une application multi-conteneurs avec un seul fichier.",
  icon: "puzzle",
  videos: [
    {
      youtubeId: "dWcoIxRfs8Y",
      title: "Déployer une app avec Docker Compose (Apprendre Docker #3)",
      author: "cocadmin",
      duration: "7:47",
      lang: "fr",
    },
    {
      youtubeId: "ES4BcZcsBdU",
      title: "Déployer un environnement avec Dockerfile et Docker Compose",
      author: "Bande de Codeurs",
      duration: "17:32",
      lang: "fr",
    },
    { youtubeId: "SXwC9fSwct8", title: "Ultimate Docker Compose Tutorial", author: "TechWorld with Nana", duration: "1:03:14", lang: "en" },
  ],
  resources: [
    {
      title: "Qu'est-ce que Docker Compose ?",
      url: "https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-docker-compose/",
      kind: "doc",
      lang: "en",
      description: "Le concept expliqué avec un exemple pas à pas.",
    },
    {
      title: "Démarrer avec Compose",
      url: "https://docs.docker.com/compose/gettingstarted/",
      kind: "doc",
      lang: "en",
      description: "Construire une application Python + Redis avec Compose.",
    },
    {
      title: "Référence du fichier Compose",
      url: "https://docs.docker.com/reference/compose-file/",
      kind: "doc",
      lang: "en",
      description: "Toutes les clés : services, volumes, networks, healthcheck…",
    },
    {
      title: "Awesome Compose",
      url: "https://github.com/docker/awesome-compose",
      kind: "article",
      lang: "en",
      description: "Dépôt officiel d'exemples de stacks prêtes à l'emploi.",
    },
  ],
  exercises: [
    {
      id: "fichier-compose",
      kind: "file",
      title: "Écrire un compose.yaml",
      intro:
        "Docker Compose décrit plusieurs services (conteneurs), leurs ports, variables, volumes et dépendances dans un fichier YAML (compose.yaml ou docker-compose.yml). Attention : l'indentation se fait avec des espaces.",
      fileName: "compose.yaml",
      instruction:
        "Déclare deux services : web (construit depuis le dossier courant, port 3000:3000, dépend de db) et db (image postgres:16, variable POSTGRES_PASSWORD: secret, volume pgdata monté sur /var/lib/postgresql/data). Déclare aussi le volume pgdata.",
      starter: `services:
  web:

  db:

`,
      checks: [
        { pattern: /^services:\s*$/m, label: "Clé racine services" },
        { pattern: /^ {2}web:\s*$/m, label: "Service web" },
        { pattern: /^ {4}build:\s*\.\/?\s*$/m, label: "web : build: ." },
        { pattern: /^ {4}ports:\s*\n\s+-\s*["']?3000:3000["']?\s*$/m, label: 'web : ports "3000:3000"' },
        { pattern: /^ {4}depends_on:\s*(\n\s+-\s*db\s*$|\[\s*db\s*\])/m, label: "web : depends_on db" },
        { pattern: /^ {2}db:\s*$/m, label: "Service db" },
        { pattern: /^ {4}image:\s*postgres:16\s*$/m, label: "db : image postgres:16" },
        { pattern: /POSTGRES_PASSWORD(:\s*|=)["']?secret["']?/m, label: "db : POSTGRES_PASSWORD" },
        { pattern: /^\s+-\s*pgdata:\/var\/lib\/postgresql\/data\s*$/m, label: "db : volume pgdata monté" },
        { pattern: /^volumes:\s*\n {2}pgdata:/m, label: "Déclaration du volume pgdata" },
      ],
      solution: `services:
  web:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:`,
    },
    {
      id: "piloter-compose",
      kind: "command",
      setup: {
        files: { ...PROJECT_FILES, "compose.yaml": COMPOSE_FILE },
      },
      title: "Piloter une stack Compose",
      intro:
        "Toutes les commandes s'exécutent dans le dossier du fichier compose. `docker compose` (avec un espace) est la version actuelle intégrée à Docker ; `docker-compose` est l'ancienne.",
      steps: [
        {
          instruction: "Démarre tous les services en arrière-plan.",
          rule: { prefixes: compose("up"), flags: [{ names: ["-d", "--detach"] }] },
          solution: "docker compose up -d",
          hint: "docker compose up + option détachée",
        },
        {
          instruction: "Affiche l'état des services de la stack.",
          rule: { prefixes: compose("ps") },
          solution: "docker compose ps",
          hint: "Comme docker ps, mais avec compose",
        },
        {
          instruction: "Suis les logs du service web uniquement (Ctrl+C pour arrêter de suivre).",
          rule: { prefixes: compose("logs"), flags: [{ names: ["-f", "--follow"] }], args: ["web"] },
          solution: "docker compose logs -f web",
          hint: "docker compose logs -f <service>",
        },
        {
          instruction: "Ouvre un shell sh dans le service db.",
          rule: { prefixes: compose("exec"), args: ["db", "sh"] },
          solution: "docker compose exec db sh",
          hint: "docker compose exec <service> <commande> (le -it est implicite)",
        },
        {
          instruction: "Quitte le shell (exit). Tu as modifié le code : reconstruis les images et redémarre la stack en arrière-plan.",
          rule: { prefixes: compose("up"), flags: [{ names: ["-d", "--detach"] }, { names: ["--build"] }] },
          solution: "docker compose up -d --build",
          hint: "docker compose up -d avec l'option --build",
        },
        {
          instruction: "Arrête et supprime les conteneurs ET les volumes de la stack.",
          rule: { prefixes: compose("down"), flags: [{ names: ["-v", "--volumes"] }] },
          solution: "docker compose down -v",
          hint: "docker compose down + option volumes",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Quelle commande démarre une stack Compose en arrière-plan ?",
      choices: ["docker compose start", "docker compose up -d", "docker compose run", "docker compose build"],
      answer: 1,
      explanation: "`up` crée et démarre les services ; `-d` les détache du terminal.",
    },
    {
      question: "Que fait `docker compose down` (sans option) ?",
      choices: [
        "Met les conteneurs en pause",
        "Arrête et supprime conteneurs et réseau, mais conserve les volumes",
        "Supprime tout, y compris les volumes et images",
        "Arrête Docker Desktop",
      ],
      answer: 1,
      explanation: "Les volumes ne sont supprimés qu'avec `-v`, pour éviter de perdre des données.",
    },
    {
      question: "Dans un compose.yaml, comment le service web joint-il le service db ?",
      choices: ["localhost:5432", "db:5432", "127.0.0.1:5432", "host.docker.internal:5432"],
      answer: 1,
      explanation: "Compose crée un réseau commun où chaque service est joignable par son nom.",
    },
    {
      question: "Que garantit `depends_on` ?",
      choices: [
        "Que db est totalement prêt avant web",
        "L'ordre de démarrage : db démarre avant web",
        "Que les deux services partagent un volume",
        "Que web redémarre si db plante",
      ],
      answer: 1,
      explanation: "Il ordonne le démarrage. Pour attendre que db soit « prêt », on ajoute un healthcheck et `condition: service_healthy`.",
    },
    {
      question: "Quelle option force la reconstruction des images au démarrage ?",
      choices: ["--rebuild", "--fresh", "--build", "--force"],
      answer: 2,
      explanation: "`docker compose up -d --build` reconstruit les services ayant une clé `build`.",
    },
    {
      question: "Quelle est la différence entre `build:` et `image:` dans un service ?",
      choices: [
        "Aucune",
        "`build` construit l'image depuis un Dockerfile local ; `image` utilise une image existante (ex: Docker Hub)",
        "`image` construit l'image",
        "`build` est obsolète",
      ],
      answer: 1,
      explanation: "On peut aussi combiner les deux pour nommer l'image construite.",
    },
  ],
};

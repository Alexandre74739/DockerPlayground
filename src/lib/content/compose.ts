import type { Module } from "../types";

const compose = (...rest: string[]) => [
  ["docker", "compose", ...rest],
  ["docker-compose", ...rest],
];

export const composeModule: Module = {
  id: "compose",
  title: "Docker Compose",
  description: "Décrire et piloter une application multi-conteneurs avec un seul fichier.",
  icon: "🧩",
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
      title: "Piloter une stack Compose",
      intro:
        "Toutes les commandes s'exécutent dans le dossier du fichier compose. `docker compose` (avec un espace) est la version actuelle intégrée à Docker ; `docker-compose` est l'ancienne.",
      steps: [
        {
          instruction: "Démarre tous les services en arrière-plan.",
          rule: { prefixes: compose("up"), flags: [{ names: ["-d", "--detach"] }] },
          solution: "docker compose up -d",
          hint: "docker compose up + option détachée",
          output: `[+] Running 4/4
 ✔ Network projet_default  Created
 ✔ Volume "projet_pgdata"  Created
 ✔ Container projet-db-1   Started
 ✔ Container projet-web-1  Started`,
        },
        {
          instruction: "Affiche l'état des services de la stack.",
          rule: { prefixes: compose("ps") },
          solution: "docker compose ps",
          hint: "Comme docker ps, mais avec compose",
          output: `NAME           IMAGE         SERVICE   STATUS         PORTS
projet-db-1    postgres:16   db        Up 2 minutes   5432/tcp
projet-web-1   projet-web    web       Up 2 minutes   0.0.0.0:3000->3000/tcp`,
        },
        {
          instruction: "Suis les logs du service web uniquement.",
          rule: { prefixes: compose("logs"), flags: [{ names: ["-f", "--follow"] }], args: ["web"] },
          solution: "docker compose logs -f web",
          hint: "docker compose logs -f <service>",
          output: `web-1  | > node server.js
web-1  | Server listening on http://0.0.0.0:3000`,
        },
        {
          instruction: "Ouvre un shell sh dans le service db.",
          rule: { prefixes: compose("exec"), args: ["db", "sh"] },
          solution: "docker compose exec db sh",
          hint: "docker compose exec <service> <commande> (le -it est implicite)",
          output: "# ",
        },
        {
          instruction: "Tu as modifié le code : reconstruis les images et redémarre en arrière-plan.",
          rule: { prefixes: compose("up"), flags: [{ names: ["-d", "--detach"] }, { names: ["--build"] }] },
          solution: "docker compose up -d --build",
          hint: "docker compose up -d avec l'option --build",
          output: `[+] Building 6.2s (10/10) FINISHED
[+] Running 2/2
 ✔ Container projet-db-1   Running
 ✔ Container projet-web-1  Started`,
        },
        {
          instruction: "Arrête et supprime les conteneurs ET les volumes de la stack.",
          rule: { prefixes: compose("down"), flags: [{ names: ["-v", "--volumes"] }] },
          solution: "docker compose down -v",
          hint: "docker compose down + option volumes",
          output: `[+] Running 4/4
 ✔ Container projet-web-1  Removed
 ✔ Container projet-db-1   Removed
 ✔ Volume projet_pgdata    Removed
 ✔ Network projet_default  Removed`,
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

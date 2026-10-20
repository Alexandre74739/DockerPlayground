import type { Module } from "../types";

const run = [
  ["docker", "run"],
  ["docker", "container", "run"],
];

export const volumesReseaux: Module = {
  id: "volumes-reseaux",
  title: "Volumes & réseaux",
  description: "Conserver des données et faire communiquer des conteneurs.",
  icon: "database",
  videos: [
    {
      youtubeId: "lstTLSM5494",
      title: "Les volumes pour persister les données… en 10 min",
      author: "xavki",
      duration: "10:46",
      lang: "fr",
    },
    { youtubeId: "vHGwkA9fsIs", title: "Les différents types de volumes Docker", author: "xavki", duration: "14:44", lang: "fr" },
    { youtubeId: "YcAWluYkVXc", title: "Les réseaux", author: "xavki", duration: "12:57", lang: "fr" },
  ],
  resources: [
    {
      title: "Persister les données",
      url: "https://docs.docker.com/get-started/docker-concepts/running-containers/persisting-container-data/",
      kind: "doc",
      lang: "en",
      description: "Introduction pratique aux volumes.",
    },
    {
      title: "Volumes",
      url: "https://docs.docker.com/engine/storage/volumes/",
      kind: "doc",
      lang: "en",
      description: "Création, partage, sauvegarde et pilotes de volumes.",
    },
    {
      title: "Bind mounts",
      url: "https://docs.docker.com/engine/storage/bind-mounts/",
      kind: "doc",
      lang: "en",
      description: "Monter un dossier de l'hôte, cas d'usage et pièges.",
    },
    {
      title: "Réseaux",
      url: "https://docs.docker.com/engine/network/",
      kind: "doc",
      lang: "en",
      description: "Pilotes réseau, DNS interne et publication de ports.",
    },
  ],
  exercises: [
    {
      id: "volumes",
      kind: "command",
      title: "Persister des données avec les volumes",
      intro:
        "Les données d'un conteneur disparaissent avec lui. Un volume est un espace de stockage géré par Docker, qui survit aux conteneurs. On le monte avec `-v nom_volume:/chemin/dans/conteneur`.",
      steps: [
        {
          instruction: "Crée un volume nommé pgdata.",
          rule: { prefixes: [["docker", "volume", "create"]], args: ["pgdata"] },
          solution: "docker volume create pgdata",
          hint: "docker volume create <nom>",
        },
        {
          instruction: "Liste les volumes.",
          rule: {
            prefixes: [
              ["docker", "volume", "ls"],
              ["docker", "volume", "list"],
            ],
          },
          solution: "docker volume ls",
          hint: "Même logique que docker image ls",
        },
        {
          instruction:
            "Lance postgres en arrière-plan avec POSTGRES_PASSWORD=secret, en montant le volume pgdata sur /var/lib/postgresql/data.",
          rule: {
            prefixes: run,
            flags: [
              { names: ["-d", "--detach"] },
              { names: ["-e", "--env"], value: "POSTGRES_PASSWORD=secret" },
              { names: ["-v", "--volume"], value: "pgdata:/var/lib/postgresql/data" },
            ],
            args: ["postgres"],
          },
          solution: "docker run -d -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres",
          hint: "-v <volume>:<chemin dans le conteneur>",
        },
        {
          instruction: "Inspecte le volume pgdata pour voir où il est stocké.",
          rule: { prefixes: [["docker", "volume", "inspect"]], args: ["pgdata"] },
          solution: "docker volume inspect pgdata",
          hint: "docker volume inspect <nom>",
        },
      ],
    },
    {
      id: "bind-mount",
      kind: "command",
      setup: {
        volumes: ["pgdata"],
        files: { "site/index.html": "<!doctype html>\n<html>\n  <body>\n    <h1>Mon site servi par Docker</h1>\n  </body>\n</html>" },
      },
      title: "Monter un dossier local (bind mount)",
      intro:
        "Un bind mount relie un dossier de ta machine à un dossier du conteneur : idéal en développement, les modifications sont visibles instantanément. Le chemin côté hôte doit être absolu ou commencer par `./`.",
      steps: [
        {
          instruction: "Lance nginx en arrière-plan sur le port 8080:80, en montant le dossier local ./site sur /usr/share/nginx/html.",
          rule: {
            prefixes: run,
            flags: [
              { names: ["-d", "--detach"] },
              { names: ["-p", "--publish"], value: "8080:80" },
              { names: ["-v", "--volume"], value: "./site:/usr/share/nginx/html" },
            ],
            args: ["nginx"],
          },
          solution: "docker run -d -p 8080:80 -v ./site:/usr/share/nginx/html nginx",
          hint: "-v <dossier local>:<dossier conteneur>",
        },
        {
          instruction: "Vérifie que nginx sert bien ta page : interroge http://localhost:8080 avec curl.",
          rule: {
            prefixes: [
              ["curl", "localhost:8080"],
              ["curl", "http://localhost:8080"],
              ["curl", "localhost:8080/"],
              ["curl", "http://localhost:8080/"],
            ],
          },
          solution: "curl localhost:8080",
          hint: "curl <adresse> affiche la réponse HTTP brute.",
        },
        {
          instruction:
            "Lance un second nginx sur le port 8081, avec le même dossier monté en lecture seule (ajoute :ro à la fin du montage).",
          rule: {
            prefixes: run,
            flags: [
              { names: ["-d", "--detach"] },
              { names: ["-p", "--publish"], value: "8081:80" },
              { names: ["-v", "--volume"], value: "./site:/usr/share/nginx/html:ro" },
            ],
            args: ["nginx"],
          },
          solution: "docker run -d -p 8081:80 -v ./site:/usr/share/nginx/html:ro nginx",
          hint: "Le port 8080 est déjà pris par le premier conteneur. Le montage se termine par …/html:ro",
        },
        {
          instruction: "Supprime le volume pgdata.",
          rule: { prefixes: [["docker", "volume", "rm"]], args: ["pgdata"] },
          solution: "docker volume rm pgdata",
          hint: "docker volume rm <nom>",
        },
      ],
    },
    {
      id: "reseaux",
      kind: "command",
      setup: {
        customImages: [{ ref: "mon-api", base: "node:22-alpine" }],
        containers: [{ name: "api", image: "mon-api", ports: ["3000:3000"] }],
      },
      title: "Réseaux Docker",
      intro:
        "Sur un réseau défini par l'utilisateur, les conteneurs se trouvent par leur nom (DNS interne). Ainsi une API peut joindre sa base via l'hôte `db`.",
      steps: [
        {
          instruction: "Crée un réseau nommé mon-reseau.",
          rule: { prefixes: [["docker", "network", "create"]], args: ["mon-reseau"] },
          solution: "docker network create mon-reseau",
          hint: "docker network create <nom>",
        },
        {
          instruction: "Liste les réseaux.",
          rule: {
            prefixes: [
              ["docker", "network", "ls"],
              ["docker", "network", "list"],
            ],
          },
          solution: "docker network ls",
          hint: "docker network ls",
        },
        {
          instruction: "Lance redis en arrière-plan, nommé cache, sur le réseau mon-reseau.",
          rule: {
            prefixes: run,
            flags: [
              { names: ["-d", "--detach"] },
              { names: ["--name"], value: "cache" },
              { names: ["--network", "--net"], value: "mon-reseau" },
            ],
            args: ["redis"],
          },
          solution: "docker run -d --name cache --network mon-reseau redis",
          hint: "--network <nom du réseau>",
        },
        {
          instruction: "Connecte le conteneur existant api au réseau mon-reseau.",
          rule: { prefixes: [["docker", "network", "connect"]], args: ["mon-reseau", "api"] },
          solution: "docker network connect mon-reseau api",
          hint: "docker network connect <réseau> <conteneur>",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Que deviennent les données écrites dans un conteneur sans volume quand on le supprime ?",
      choices: [
        "Elles sont sauvegardées sur Docker Hub",
        "Elles sont perdues",
        "Elles sont copiées dans l'image",
        "Elles vont dans un volume par défaut",
      ],
      answer: 1,
      explanation: "La couche d'écriture du conteneur est supprimée avec lui. D'où l'intérêt des volumes.",
    },
    {
      question: "Quelle est la différence entre `-v pgdata:/data` et `-v ./pgdata:/data` ?",
      choices: [
        "Aucune",
        "Le premier utilise un volume nommé géré par Docker ; le second monte un dossier local (bind mount)",
        "Le second est en lecture seule",
        "Le premier ne fonctionne que sous Windows",
      ],
      answer: 1,
      explanation: "Un nom simple = volume nommé. Un chemin (./, /, C:\\) = bind mount.",
    },
    {
      question: "Comment un conteneur `api` peut-il joindre un conteneur `db` sur le même réseau utilisateur ?",
      choices: ["Via localhost", "Via l'hôte `db` (son nom)", "Via l'IP de la machine", "C'est impossible"],
      answer: 1,
      explanation: "Docker fournit un DNS interne : le nom du conteneur (ou du service Compose) sert de nom d'hôte.",
    },
    {
      question: "Que signifie `:ro` à la fin d'un montage ?",
      choices: ["read only (lecture seule)", "remove on exit", "root owner", "rapid output"],
      answer: 0,
      explanation: "Le conteneur peut lire les fichiers mais pas les modifier.",
    },
    {
      question: "Dans un conteneur, `localhost` désigne…",
      choices: ["Ta machine", "Le conteneur lui-même", "Docker Hub", "Le conteneur de base de données"],
      answer: 1,
      explanation: "Chaque conteneur a sa propre interface réseau. Pour joindre ta machine depuis Docker Desktop : `host.docker.internal`.",
    },
  ],
};

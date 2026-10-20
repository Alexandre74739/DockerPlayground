import type { Module } from "../types";

const run = [["docker", "run"], ["docker", "container", "run"]];

export const volumesReseaux: Module = {
  id: "volumes-reseaux",
  title: "Volumes & réseaux",
  description: "Conserver des données et faire communiquer des conteneurs.",
  icon: "🔗",
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
          output: "pgdata",
        },
        {
          instruction: "Liste les volumes.",
          rule: { prefixes: [["docker", "volume", "ls"], ["docker", "volume", "list"]] },
          solution: "docker volume ls",
          hint: "Même logique que docker image ls",
          output: `DRIVER    VOLUME NAME
local     pgdata`,
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
          output: "b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
        },
        {
          instruction: "Inspecte le volume pgdata pour voir où il est stocké.",
          rule: { prefixes: [["docker", "volume", "inspect"]], args: ["pgdata"] },
          solution: "docker volume inspect pgdata",
          hint: "docker volume inspect <nom>",
          output: `[
    {
        "CreatedAt": "2026-10-20T10:20:00Z",
        "Driver": "local",
        "Mountpoint": "/var/lib/docker/volumes/pgdata/_data",
        "Name": "pgdata",
        "Scope": "local"
    }
]`,
        },
      ],
    },
    {
      id: "bind-mount",
      kind: "command",
      title: "Monter un dossier local (bind mount)",
      intro:
        "Un bind mount relie un dossier de ta machine à un dossier du conteneur : idéal en développement, les modifications sont visibles instantanément. Le chemin côté hôte doit être absolu ou commencer par `./`.",
      steps: [
        {
          instruction:
            "Lance nginx en arrière-plan sur le port 8080:80, en montant le dossier local ./site sur /usr/share/nginx/html.",
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
          output: "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
        },
        {
          instruction: "Même chose mais en lecture seule (ajoute :ro à la fin du montage).",
          rule: {
            prefixes: run,
            flags: [
              { names: ["-d", "--detach"] },
              { names: ["-p", "--publish"], value: "8080:80" },
              { names: ["-v", "--volume"], value: "./site:/usr/share/nginx/html:ro" },
            ],
            args: ["nginx"],
          },
          solution: "docker run -d -p 8080:80 -v ./site:/usr/share/nginx/html:ro nginx",
          hint: "…/html:ro",
          output: "f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
        },
        {
          instruction: "Supprime le volume pgdata.",
          rule: { prefixes: [["docker", "volume", "rm"]], args: ["pgdata"] },
          solution: "docker volume rm pgdata",
          hint: "docker volume rm <nom>",
          output: "pgdata",
        },
      ],
    },
    {
      id: "reseaux",
      kind: "command",
      title: "Réseaux Docker",
      intro:
        "Sur un réseau défini par l'utilisateur, les conteneurs se trouvent par leur nom (DNS interne). Ainsi une API peut joindre sa base via l'hôte `db`.",
      steps: [
        {
          instruction: "Crée un réseau nommé mon-reseau.",
          rule: { prefixes: [["docker", "network", "create"]], args: ["mon-reseau"] },
          solution: "docker network create mon-reseau",
          hint: "docker network create <nom>",
          output: "9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0",
        },
        {
          instruction: "Liste les réseaux.",
          rule: { prefixes: [["docker", "network", "ls"], ["docker", "network", "list"]] },
          solution: "docker network ls",
          hint: "docker network ls",
          output: `NETWORK ID     NAME         DRIVER    SCOPE
1a2b3c4d5e6f   bridge       bridge    local
9f8e7d6c5b4a   mon-reseau   bridge    local
2b3c4d5e6f7a   host         host      local
3c4d5e6f7a8b   none         null      local`,
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
          output: "0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9",
        },
        {
          instruction: "Connecte le conteneur existant api au réseau mon-reseau.",
          rule: { prefixes: [["docker", "network", "connect"]], args: ["mon-reseau", "api"] },
          solution: "docker network connect mon-reseau api",
          hint: "docker network connect <réseau> <conteneur>",
          output: "",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Que deviennent les données écrites dans un conteneur sans volume quand on le supprime ?",
      choices: ["Elles sont sauvegardées sur Docker Hub", "Elles sont perdues", "Elles sont copiées dans l'image", "Elles vont dans un volume par défaut"],
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

import type { Module } from "../types";

const app = { requiredEnv: ["DATABASE_URL"], urlEnv: ["DATABASE_URL"] };

export const debug: Module = {
  id: "debug",
  title: "Déboguer et dépanner",
  description: "Une méthode pour diagnostiquer un conteneur qui plante, un port occupé ou un problème réseau.",
  icon: "bug",
  videos: [
    {
      youtubeId: "Cm3HCuwFAh0",
      title: "Les multiples facettes du logging dans un container Docker",
      author: "Devoxx France",
      duration: "28:36",
      lang: "fr",
    },
    { youtubeId: "Cx0BNPsPmoU", title: "Docker exec vs attach", author: "xavki", duration: "13:24", lang: "fr" },
    {
      youtubeId: "kGaGEW6VBrI",
      title: "Docker Logs and Debugging — Real Troubleshooting Example",
      author: "Devops Basics with Dali",
      duration: "6:28",
      lang: "en",
    },
  ],
  resources: [
    {
      title: "Journalisation",
      url: "https://docs.docker.com/engine/logging/",
      kind: "doc",
      lang: "en",
      description: "Où vont les journaux des conteneurs et comment les configurer.",
    },
    {
      title: "Référence docker logs",
      url: "https://docs.docker.com/reference/cli/docker/container/logs/",
      kind: "doc",
      lang: "en",
      description: "--tail, --since, --follow, --timestamps.",
    },
    {
      title: "Référence docker inspect",
      url: "https://docs.docker.com/reference/cli/docker/inspect/",
      kind: "doc",
      lang: "en",
      description: "Extraire n'importe quelle information avec --format.",
    },
    {
      title: "Réseau bridge",
      url: "https://docs.docker.com/engine/network/drivers/bridge/",
      kind: "doc",
      lang: "en",
      description: "Pourquoi le réseau par défaut ne résout pas les noms des conteneurs.",
    },
    {
      title: "Politiques de redémarrage",
      url: "https://docs.docker.com/engine/containers/start-containers-automatically/",
      kind: "doc",
      lang: "en",
      description: "no, always, unless-stopped, on-failure : leurs effets.",
    },
  ],
  exercises: [
    {
      id: "dns",
      kind: "command",
      title: "L'API ne trouve pas sa base",
      intro:
        "Un collègue a lancé une base `db` et une API `api` avec `docker run`, mais l'API s'arrête aussitôt. Diagnostique et répare **sans recréer** les conteneurs.",
      setup: {
        customImages: [{ ref: "mon-api", base: "node:22-alpine", user: "node" }],
        app,
        commands: [
          "docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:16",
          "docker run -d --name api -p 3000:3000 -e DATABASE_URL=postgres://postgres:secret@db:5432/app mon-api",
        ],
      },
      steps: [
        {
          instruction: "Liste tous les conteneurs pour voir leur état.",
          rule: {
            prefixes: [
              ["docker", "ps"],
              ["docker", "container", "ls"],
            ],
            flags: [{ names: ["-a", "--all"] }],
          },
          solution: "docker ps -a",
          hint: "Un conteneur arrêté n'apparaît qu'avec -a.",
        },
        {
          instruction: "Lis les journaux de l'API.",
          rule: {
            prefixes: [
              ["docker", "logs"],
              ["docker", "container", "logs"],
            ],
            args: ["api"],
          },
          solution: "docker logs api",
          hint: "docker logs <nom>",
        },
        {
          instruction: "ENOTFOUND : le réseau par défaut ne résout pas les noms. Crée un réseau app-net.",
          rule: { prefixes: [["docker", "network", "create"]], args: ["app-net"] },
          solution: "docker network create app-net",
          hint: "docker network create <nom>",
        },
        {
          instruction: "Connecte la base au réseau app-net.",
          rule: { prefixes: [["docker", "network", "connect"]], args: ["app-net", "db"] },
          solution: "docker network connect app-net db",
          hint: "docker network connect <réseau> <conteneur>",
        },
        {
          instruction: "Connecte aussi l'API au réseau app-net.",
          rule: { prefixes: [["docker", "network", "connect"]], args: ["app-net", "api"] },
          solution: "docker network connect app-net api",
          hint: "Même commande, autre conteneur.",
        },
        {
          instruction: "Redémarre l'API.",
          rule: {
            prefixes: [
              ["docker", "start"],
              ["docker", "container", "start"],
              ["docker", "restart"],
            ],
            args: ["api"],
          },
          solution: "docker start api",
          hint: "docker start <nom>",
        },
        {
          instruction: "Vérifie qu'elle répond sur le port 3000.",
          rule: {
            prefixes: [
              ["curl", "localhost:3000"],
              ["curl", "http://localhost:3000"],
              ["curl", "localhost:3000/"],
              ["curl", "http://localhost:3000/"],
            ],
          },
          solution: "curl localhost:3000",
          hint: "curl localhost:3000",
        },
      ],
    },
    {
      id: "port-occupe",
      kind: "command",
      title: "Port déjà utilisé",
      intro:
        "Tu dois lancer le nouveau site sur le port 8080, mais un ancien conteneur l'occupe encore. Observe l'erreur, puis libère le port proprement.",
      setup: { images: ["nginx"], containers: [{ name: "ancien-site", image: "nginx", ports: ["8080:80"] }] },
      steps: [
        {
          instruction: "Lance nginx en arrière-plan, nommé site, sur le port 8080 : la commande doit échouer.",
          rule: {
            prefixes: [
              ["docker", "run"],
              ["docker", "container", "run"],
            ],
            flags: [{ names: ["-d", "--detach"] }, { names: ["-p", "--publish"], value: "8080:80" }, { names: ["--name"], value: "site" }],
            args: ["nginx"],
          },
          solution: "docker run -d -p 8080:80 --name site nginx",
          hint: "Lis bien le message d'erreur.",
          expect: "failure",
        },
        {
          instruction: "Repère le conteneur qui publie déjà le port 8080.",
          rule: {
            prefixes: [
              ["docker", "ps"],
              ["docker", "container", "ls"],
            ],
          },
          solution: "docker ps",
          hint: "Regarde la colonne PORTS.",
        },
        {
          instruction: "Arrête ce conteneur.",
          rule: {
            prefixes: [
              ["docker", "stop"],
              ["docker", "container", "stop"],
            ],
            args: ["ancien-site"],
          },
          solution: "docker stop ancien-site",
          hint: "docker stop <nom>",
        },
        {
          instruction: "Le conteneur site a été créé malgré l'erreur : démarre-le au lieu de le recréer.",
          rule: {
            prefixes: [
              ["docker", "start"],
              ["docker", "container", "start"],
            ],
            args: ["site"],
          },
          solution: "docker start site",
          hint: "Un docker run raté laisse un conteneur à l'état Created.",
        },
        {
          instruction: "Vérifie que le site répond.",
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
    {
      id: "inspecter",
      kind: "command",
      title: "Extraire une information précise",
      intro:
        "`docker inspect` renvoie des centaines de lignes. Avec `--format` et un chemin entre doubles accolades, on n'affiche que ce qui nous intéresse : pratique en script ou en astreinte.",
      setup: { images: ["nginx"], containers: [{ name: "web", image: "nginx", ports: ["8080:80"], restart: "unless-stopped" }] },
      steps: [
        {
          instruction: "Affiche uniquement l'état du conteneur web (champ .State.Status).",
          rule: {
            prefixes: [
              ["docker", "inspect"],
              ["docker", "container", "inspect"],
            ],
            flags: [{ names: ["-f", "--format"], value: "{{.State.Status}}" }],
            args: ["web"],
          },
          solution: "docker inspect --format '{{.State.Status}}' web",
          hint: "docker inspect --format '{{.Chemin.Du.Champ}}' <conteneur>",
        },
        {
          instruction: "Affiche sa politique de redémarrage (.HostConfig.RestartPolicy.Name).",
          rule: {
            prefixes: [
              ["docker", "inspect"],
              ["docker", "container", "inspect"],
            ],
            flags: [{ names: ["-f", "--format"], value: "{{.HostConfig.RestartPolicy.Name}}" }],
            args: ["web"],
          },
          solution: "docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' web",
          hint: "Même principe, autre chemin.",
        },
        {
          instruction: "Affiche les processus qui tournent dans web.",
          rule: {
            prefixes: [
              ["docker", "top"],
              ["docker", "container", "top"],
            ],
            args: ["web"],
          },
          solution: "docker top web",
          hint: "docker top <conteneur>",
        },
        {
          instruction: "Affiche la configuration nginx du site (/etc/nginx/conf.d/default.conf) sans ouvrir de shell.",
          rule: {
            prefixes: [
              ["docker", "exec"],
              ["docker", "container", "exec"],
            ],
            args: ["web", "cat", "/etc/nginx/conf.d/default.conf"],
          },
          solution: "docker exec web cat /etc/nginx/conf.d/default.conf",
          hint: "docker exec <conteneur> cat <fichier>",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Un conteneur s'arrête immédiatement après `docker run -d`. Première commande à lancer ?",
      choices: ["docker rm", "docker logs <conteneur>", "docker rmi", "docker system prune"],
      answer: 1,
      explanation: "La cause est presque toujours dans les journaux : variable manquante, fichier introuvable, connexion refusée…",
    },
    {
      question: "`getaddrinfo ENOTFOUND db` dans les journaux de l'API signifie…",
      choices: [
        "Le mot de passe est faux",
        "Le nom db ne se résout pas : les conteneurs ne sont pas sur un même réseau défini par l'utilisateur",
        "La base est trop lente",
        "Le port 5432 est fermé sur l'hôte",
      ],
      answer: 1,
      explanation: "Le réseau bridge par défaut n'a pas de DNS. Un réseau créé (ou Compose) résout les noms des conteneurs.",
    },
    {
      question: "`ECONNREFUSED 127.0.0.1:5432` alors que la base tourne dans un autre conteneur. Pourquoi ?",
      choices: [
        "La base est arrêtée",
        "Dans le conteneur, localhost désigne le conteneur lui-même : il faut utiliser le nom du service (db)",
        "Le port est mal publié",
        "Il manque --privileged",
      ],
      answer: 1,
      explanation: "Erreur très fréquente quand on passe d'une installation locale à Docker.",
    },
    {
      question: "Un conteneur apparaît en `Restarting (1)` en boucle. Que comprendre ?",
      choices: [
        "Tout va bien",
        "Son processus plante à chaque démarrage et la politique restart le relance : il faut lire ses journaux",
        "Docker Desktop est en panne",
        "Il est en cours de mise à jour",
      ],
      answer: 1,
      explanation: "La politique `always` / `unless-stopped` masque le crash : `docker logs` montre l'erreur.",
    },
    {
      question: "Comment n'afficher que l'adresse IP d'un conteneur ?",
      choices: [
        "docker ip web",
        "docker inspect --format '{{.NetworkSettings.IPAddress}}' web",
        "docker logs web | grep ip",
        "docker network ip web",
      ],
      answer: 1,
      explanation: "`--format` accepte un modèle Go : n'importe quel champ du JSON est accessible.",
    },
  ],
};

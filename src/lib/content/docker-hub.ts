import type { Module } from "../types";

export const dockerHub: Module = {
  id: "docker-hub",
  title: "Docker Hub",
  description: "Rechercher, publier et partager ses images sur le registre Docker Hub.",
  icon: "☁️",
  exercises: [
    {
      id: "rechercher",
      kind: "command",
      title: "Rechercher une image",
      intro:
        "Docker Hub (hub.docker.com) est le registre public par défaut. Les images « Official » (nginx, postgres, node…) sont maintenues et sécurisées : privilégie-les.",
      steps: [
        {
          instruction: "Recherche les images liées à redis sur Docker Hub.",
          rule: { prefixes: [["docker", "search"]], args: ["redis"] },
          solution: "docker search redis",
          hint: "docker search <terme>",
          output: `NAME                 DESCRIPTION                                     STARS     OFFICIAL
redis                Redis is the world's fastest data platform…    13000     [OK]
redis/redis-stack    redis-stack installs a Redis server with…       120
bitnami/redis        Bitnami container image for Redis              300`,
        },
        {
          instruction: "Recherche uniquement les images officielles de python (filtre is-official=true).",
          rule: {
            prefixes: [["docker", "search"]],
            flags: [{ names: ["-f", "--filter"], value: "is-official=true" }],
            args: ["python"],
          },
          solution: "docker search --filter is-official=true python",
          hint: "--filter is-official=true",
          output: `NAME      DESCRIPTION                                     STARS     OFFICIAL
python    Python is an interpreted, interactive, objec…   10000     [OK]`,
        },
      ],
    },
    {
      id: "publier",
      kind: "command",
      title: "Publier son image",
      intro:
        "Pour publier, l'image doit être nommée `utilisateur/depot:tag`. Étapes : se connecter, taguer, pousser. Dans cet exercice, ton identifiant Docker Hub est **alex**.",
      steps: [
        {
          instruction: "Connecte-toi à Docker Hub.",
          rule: { prefixes: [["docker", "login"]] },
          solution: "docker login",
          hint: "docker login",
          output: `Log in with your Docker ID or email address to push and pull images from Docker Hub.
Username: alex
Password:
Login Succeeded`,
        },
        {
          instruction: "Tague ton image locale mon-app:1.0 en alex/mon-app:1.0.",
          rule: { prefixes: [["docker", "tag"], ["docker", "image", "tag"]], args: ["mon-app:1.0", "alex/mon-app:1.0"] },
          solution: "docker tag mon-app:1.0 alex/mon-app:1.0",
          hint: "docker tag <source> <utilisateur>/<depot>:<tag>",
          output: "",
        },
        {
          instruction: "Pousse alex/mon-app:1.0 sur Docker Hub.",
          rule: { prefixes: [["docker", "push"], ["docker", "image", "push"]], args: ["alex/mon-app:1.0"] },
          solution: "docker push alex/mon-app:1.0",
          hint: "L'inverse de pull",
          output: `The push refers to repository [docker.io/alex/mon-app]
5f70bf18a086: Pushed
a8f3c1e2d4b6: Pushed
1.0: digest: sha256:3b1f…c9d2 size: 1782`,
        },
        {
          instruction: "Ajoute aussi le tag latest à cette image (alex/mon-app:latest).",
          rule: { prefixes: [["docker", "tag"], ["docker", "image", "tag"]], args: ["alex/mon-app:1.0", "alex/mon-app:latest"] },
          solution: "docker tag alex/mon-app:1.0 alex/mon-app:latest",
          hint: "Un même IMAGE ID peut avoir plusieurs tags",
          output: "",
        },
        {
          instruction: "Pousse tous les tags du dépôt alex/mon-app en une seule commande.",
          rule: {
            prefixes: [["docker", "push"], ["docker", "image", "push"]],
            flags: [{ names: ["-a", "--all-tags"] }],
            args: ["alex/mon-app"],
          },
          solution: "docker push --all-tags alex/mon-app",
          hint: "Option --all-tags",
          output: `The push refers to repository [docker.io/alex/mon-app]
1.0: digest: sha256:3b1f…c9d2 size: 1782
latest: digest: sha256:3b1f…c9d2 size: 1782`,
        },
        {
          instruction: "Déconnecte-toi de Docker Hub.",
          rule: { prefixes: [["docker", "logout"]] },
          solution: "docker logout",
          hint: "Le contraire de login",
          output: "Removing login credentials for https://index.docker.io/v1/",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Quel format de nom faut-il pour pousser une image sur Docker Hub ?",
      choices: ["depot:tag", "utilisateur/depot:tag", "docker.io:depot", "hub/utilisateur/depot"],
      answer: 1,
      explanation: "Sans le préfixe utilisateur, Docker essaierait de pousser vers `library/` (images officielles) : refusé.",
    },
    {
      question: "Que signifie le badge « Official » sur Docker Hub ?",
      choices: [
        "L'image est payante",
        "L'image est maintenue par Docker et l'éditeur, avec un suivi de sécurité",
        "L'image a plus de 1000 étoiles",
        "L'image ne fonctionne que sur Docker Desktop",
      ],
      answer: 1,
      explanation: "Les Docker Official Images sont une sélection curée et régulièrement mise à jour.",
    },
    {
      question: "Que fait `docker push alex/app:2.0` si tu n'es pas connecté ?",
      choices: ["Il pousse en anonyme", "Il échoue avec une erreur d'authentification", "Il crée un compte", "Il pousse en privé"],
      answer: 1,
      explanation: "Il faut d'abord `docker login` (ou se connecter via Docker Desktop).",
    },
    {
      question: "Pourquoi éviter de n'utiliser que le tag `latest` en production ?",
      choices: [
        "Il est plus lent",
        "Il est mutable : son contenu change à chaque publication, ce qui rend les déploiements imprévisibles",
        "Il est interdit par Docker Hub",
        "Il ne fonctionne pas avec Compose",
      ],
      answer: 1,
      explanation: "Un tag versionné (1.0, 1.0.3…) garantit de savoir exactement ce qui est déployé.",
    },
    {
      question: "Où Docker Desktop permet-il de se connecter à Docker Hub ?",
      choices: [
        "Uniquement en ligne de commande",
        "Via le bouton « Sign in » en haut de l'interface, ce qui connecte aussi la CLI",
        "Dans le Dockerfile",
        "Ce n'est pas possible",
      ],
      answer: 1,
      explanation: "La connexion est partagée entre l'interface et la CLI `docker`.",
    },
  ],
};

import type { Module } from "../types";
import { API_SOURCE } from "./fixtures";

const tag = [
  ["docker", "tag"],
  ["docker", "image", "tag"],
];

export const hubEquipe: Module = {
  id: "hub-equipe",
  title: "Docker Hub et CI/CD en entreprise",
  description: "Organisations, versionnement, images multi-plateformes et publication automatique.",
  icon: "git",
  videos: [
    {
      youtubeId: "gvceCGxeI2c",
      title: "GitHub Actions pour débutants : build & push sur Docker Hub",
      author: "Civilisation IT",
      duration: "13:37",
      lang: "fr",
    },
    {
      youtubeId: "x7f9x30W_dI",
      title: "Build and Push Docker Images with GitHub Actions",
      author: "Rishab in Cloud",
      duration: "13:13",
      lang: "en",
    },
    {
      youtubeId: "hWSHtHasJUI",
      title: "How to Build Multi-Architecture Docker Images with BuildX",
      author: "DevOps Directive",
      duration: "10:35",
      lang: "en",
    },
  ],
  resources: [
    {
      title: "Docker et GitHub Actions",
      url: "https://docs.docker.com/build/ci/github-actions/",
      kind: "doc",
      lang: "en",
      description: "Construire, tester et publier ses images en intégration continue.",
    },
    {
      title: "docker/build-push-action",
      url: "https://github.com/docker/build-push-action",
      kind: "article",
      lang: "en",
      description: "L'action officielle, avec de nombreux exemples de workflows.",
    },
    {
      title: "Images multi-plateformes",
      url: "https://docs.docker.com/build/building/multi-platform/",
      kind: "doc",
      lang: "en",
      description: "Une même image pour les serveurs x86 et les Mac Apple Silicon (arm64).",
    },
    {
      title: "Organisations Docker",
      url: "https://docs.docker.com/admin/organization/",
      kind: "doc",
      lang: "en",
      description: "Équipes, droits et dépôts partagés en entreprise.",
    },
    {
      title: "Paramètres des dépôts",
      url: "https://docs.docker.com/docker-hub/repos/settings/",
      kind: "doc",
      lang: "en",
      description: "Visibilité publique ou privée, description, immutabilité des tags.",
    },
    {
      title: "Gestion sémantique de version",
      url: "https://semver.org/lang/fr/",
      kind: "article",
      lang: "fr",
      description: "MAJEUR.MINEUR.CORRECTIF : la convention des tags d'images.",
    },
  ],
  exercises: [
    {
      id: "versionner",
      kind: "command",
      title: "Publier une version pour l'équipe",
      intro:
        "En entreprise, les images sont publiées dans l'**organisation** (ici `acme`), pas dans ton compte personnel. On publie une version précise et des tags « flottants » : `1.4.2` ne bouge plus jamais, `1.4` et `latest` suivent la dernière version.",
      setup: { customImages: [{ ref: "api:1.4.2", base: "node:22-alpine" }], auth: "alex", orgs: ["acme"] },
      steps: [
        {
          instruction: "Tague api:1.4.2 en acme/api:1.4.2.",
          rule: { prefixes: tag, args: ["api:1.4.2", "acme/api:1.4.2"] },
          solution: "docker tag api:1.4.2 acme/api:1.4.2",
          hint: "docker tag <source> <organisation>/<dépôt>:<tag>",
        },
        {
          instruction: "Ajoute le tag mineur acme/api:1.4.",
          rule: { prefixes: tag, args: ["api:1.4.2", "acme/api:1.4"] },
          solution: "docker tag api:1.4.2 acme/api:1.4",
          hint: "Même source, autre tag.",
        },
        {
          instruction: "Ajoute le tag acme/api:latest.",
          rule: { prefixes: tag, args: ["api:1.4.2", "acme/api:latest"] },
          solution: "docker tag api:1.4.2 acme/api:latest",
          hint: "Même source, tag latest.",
        },
        {
          instruction: "Pousse tous les tags du dépôt acme/api en une commande.",
          rule: {
            prefixes: [
              ["docker", "push"],
              ["docker", "image", "push"],
            ],
            flags: [{ names: ["-a", "--all-tags"] }],
            args: ["acme/api"],
          },
          solution: "docker push --all-tags acme/api",
          hint: "Option --all-tags",
        },
        {
          instruction: "Vérifie sur le registre ce qui a été publié pour acme/api:1.4.",
          rule: { prefixes: [["docker", "buildx", "imagetools", "inspect"]], args: ["acme/api:1.4"] },
          solution: "docker buildx imagetools inspect acme/api:1.4",
          hint: "docker buildx imagetools inspect <image>",
        },
      ],
    },
    {
      id: "multi-plateforme",
      kind: "command",
      title: "Une image pour Intel et Apple Silicon",
      intro:
        "Une partie de l'équipe travaille sur des Mac Apple Silicon (arm64), les serveurs sont en x86 (amd64). `docker buildx build --platform` construit les deux variantes ; `--push` les publie sous un seul tag.",
      setup: { files: { ...API_SOURCE }, auth: "alex", orgs: ["acme"] },
      steps: [
        {
          instruction: "Construis et publie acme/api:2.0.0 pour linux/amd64 et linux/arm64 en une seule commande.",
          rule: {
            prefixes: [
              ["docker", "buildx", "build"],
              ["docker", "build"],
            ],
            flags: [
              { names: ["--platform"], value: "linux/amd64,linux/arm64" },
              { names: ["-t", "--tag"], value: "acme/api:2.0.0" },
              { names: ["--push"] },
            ],
            args: ["."],
          },
          solution: "docker buildx build --platform linux/amd64,linux/arm64 -t acme/api:2.0.0 --push .",
          hint: "--platform accepte une liste séparée par des virgules ; --push publie directement.",
        },
        {
          instruction: "Vérifie que les deux plateformes sont bien présentes sur le registre.",
          rule: { prefixes: [["docker", "buildx", "imagetools", "inspect"]], args: ["acme/api:2.0.0"] },
          solution: "docker buildx imagetools inspect acme/api:2.0.0",
          hint: "docker buildx imagetools inspect <image>",
        },
      ],
    },
    {
      id: "github-actions",
      kind: "file",
      title: "Publier automatiquement avec GitHub Actions",
      intro:
        "Plus personne ne publie à la main : à chaque tag Git `v*`, la CI construit et pousse l'image. Les identifiants Docker Hub sont stockés dans les **secrets** du dépôt GitHub, jamais dans le fichier.",
      fileName: ".github/workflows/docker.yml",
      instruction:
        "Complète le job : connexion avec docker/login-action (secrets DOCKERHUB_USERNAME et DOCKERHUB_TOKEN), mise en place de Buildx avec docker/setup-buildx-action, puis docker/build-push-action avec push: true et le tag acme/api:${{ github.ref_name }}.",
      starter: `name: docker

on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

`,
      checks: [
        { pattern: /uses:\s*docker\/login-action@v\d+/, label: "docker/login-action" },
        { pattern: /username:\s*\$\{\{\s*secrets\.DOCKERHUB_USERNAME\s*\}\}/, label: "username depuis secrets.DOCKERHUB_USERNAME" },
        { pattern: /password:\s*\$\{\{\s*secrets\.DOCKERHUB_TOKEN\s*\}\}/, label: "password depuis secrets.DOCKERHUB_TOKEN" },
        { pattern: /uses:\s*docker\/setup-buildx-action@v\d+/, label: "docker/setup-buildx-action" },
        { pattern: /uses:\s*docker\/build-push-action@v\d+/, label: "docker/build-push-action" },
        { pattern: /push:\s*true/, label: "push: true" },
        { pattern: /tags:\s*acme\/api:\$\{\{\s*github\.ref_name\s*\}\}/, label: "tags: acme/api:${{ github.ref_name }}" },
      ],
      solution: `name: docker

on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKERHUB_USERNAME }}
          password: \${{ secrets.DOCKERHUB_TOKEN }}

      - uses: docker/setup-buildx-action@v3

      - uses: docker/build-push-action@v6
        with:
          push: true
          platforms: linux/amd64,linux/arm64
          tags: acme/api:\${{ github.ref_name }}
`,
    },
    {
      id: "hors-ligne",
      kind: "command",
      title: "Transmettre une image sans registre",
      intro:
        "Serveur sans accès à Internet, client qui exige un livrable : `docker save` exporte une image dans une archive, `docker load` la réimporte ailleurs.",
      setup: { customImages: [{ ref: "api:1.4.2", base: "node:22-alpine" }] },
      steps: [
        {
          instruction: "Exporte api:1.4.2 dans l'archive api-1.4.2.tar.",
          rule: {
            prefixes: [
              ["docker", "save"],
              ["docker", "image", "save"],
            ],
            flags: [{ names: ["-o", "--output"], value: "api-1.4.2.tar" }],
            args: ["api:1.4.2"],
          },
          solution: "docker save -o api-1.4.2.tar api:1.4.2",
          hint: "docker save -o <fichier> <image>",
        },
        {
          instruction: "Vérifie que l'archive est bien là.",
          rule: { prefixes: [["ls"]] },
          solution: "ls",
          hint: "ls",
        },
        {
          instruction: "Simule l'autre machine : supprime l'image locale.",
          rule: {
            prefixes: [
              ["docker", "rmi"],
              ["docker", "image", "rm"],
            ],
            args: ["api:1.4.2"],
          },
          solution: "docker rmi api:1.4.2",
          hint: "docker rmi <image>",
        },
        {
          instruction: "Réimporte l'image depuis l'archive.",
          rule: {
            prefixes: [
              ["docker", "load"],
              ["docker", "image", "load"],
            ],
            flags: [{ names: ["-i", "--input"], value: "api-1.4.2.tar" }],
          },
          solution: "docker load -i api-1.4.2.tar",
          hint: "docker load -i <fichier>",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "Pourquoi publier dans une organisation (`acme/api`) plutôt que dans son compte (`alex/api`) ?",
      choices: [
        "C'est plus rapide",
        "Les droits sont gérés par équipe et l'image ne dépend pas d'une personne qui peut quitter l'entreprise",
        "Les images d'organisation sont gratuites",
        "Docker Hub l'impose",
      ],
      answer: 1,
      explanation: "L'organisation porte les dépôts, les équipes et les permissions (lecture, écriture, administration).",
    },
    {
      question: "Quelle stratégie de tags est la plus saine pour une version 2.3.1 ?",
      choices: ["Uniquement latest", "2.3.1 (immuable) + 2.3 + 2 + latest (flottants)", "Un tag par jour", "Le hash du commit uniquement"],
      answer: 1,
      explanation: "Chacun choisit son niveau de stabilité : `2.3.1` ne bouge jamais, `2` suit les mises à jour compatibles.",
    },
    {
      question: "Comment la CI doit-elle s'authentifier sur Docker Hub ?",
      choices: [
        "Avec ton mot de passe écrit dans le workflow",
        "Avec un jeton d'accès (PAT) stocké dans les secrets du dépôt",
        "Sans authentification",
        "Avec le compte d'un collègue",
      ],
      answer: 1,
      explanation: "Un jeton dédié se révoque facilement et peut être limité en droits (lecture/écriture).",
    },
    {
      question: "Un collègue sur Mac M2 obtient `no matching manifest for linux/arm64`. Que faut-il faire ?",
      choices: [
        "Lui demander de changer de machine",
        "Publier l'image pour linux/amd64 et linux/arm64 avec buildx --platform",
        "Supprimer le tag latest",
        "Passer le dépôt en privé",
      ],
      answer: 1,
      explanation: "Une image multi-plateforme contient une variante par architecture ; Docker choisit automatiquement la bonne.",
    },
    {
      question: "À quoi sert `docker save` ?",
      choices: [
        "À sauvegarder un conteneur en cours",
        "À exporter une ou plusieurs images dans une archive tar, à recharger avec docker load",
        "À publier sur Docker Hub",
        "À sauvegarder un volume",
      ],
      answer: 1,
      explanation: "Utile pour les environnements isolés d'Internet ou pour livrer une version figée.",
    },
  ],
};

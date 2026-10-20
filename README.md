# Docker Playground

Plateforme locale pour apprendre la ligne de commande Docker par la pratique :

- **Cours** écrits pour chaque module, avec des vidéos (FR et EN) et une section « Aller plus loin » (documentation officielle, labs en ligne) ;
- **Terminal simulé** qui se comporte comme un vrai : état persistant (conteneurs, images, volumes, réseaux, fichiers), vraies sorties et vrais messages d'erreur de la CLI, questions interactives (`docker login`, confirmations `[y/N]`), shells dans les conteneurs (`docker exec -it … sh`), processus au premier plan interrompus par Ctrl+C ;
- **Éditeur** pour écrire des `Dockerfile`, `.dockerignore` et `compose.yaml` ;
- **Quiz** à la fin de chaque module, et un **aide-mémoire** filtrable ;
- **Cas pratiques** (page `/cas-pratiques`) : des missions d'entreprise sans étapes guidées, dans un espace façon IDE
  (fichiers du projet + terminal). Le travail livré est évalué sur l'état réel du simulateur : score sur 100,
  chronomètre, commandes, erreurs et indices ; le meilleur résultat est conservé.

## Parcours

| Parcours | Modules |
| --- | --- |
| 1. Fondamentaux | Premiers pas, Images, Conteneurs, Dockerfile, Volumes & réseaux, Compose, Docker Hub, Nettoyage & Docker Desktop |
| 2. Dockeriser ses applications | Dockeriser une application, Dockerfile et .dockerignore avancés, Configuration et secrets, Sécurité et optimisation |
| 3. Travailler en équipe | Compose en équipe, Docker Hub et CI/CD en entreprise, Déployer sur un VPS avec SSH, Déboguer et dépanner |

Les 12 cas pratiques couvrent : mise en ligne d'un site statique, ménage d'un serveur de CI, dockerisation d'une API
Node.js et d'une API Python (.dockerignore), builds accélérés par le cache, environnement de développement Compose,
publication d'une release multi-plateforme, workflow GitHub Actions, résolution d'incident, optimisation d'image
multi-étapes, mise en production sur un VPS et audit de sécurité d'un serveur.

Une page **Ressources** regroupe toutes les vidéos et la documentation, filtrables par type, langue et mot-clé.

Le simulateur gère aussi un **serveur distant** : `ssh`, `scp`, `ssh-keygen`, `ssh-copy-id`, `sudo`, installation de
Docker, groupe `docker`, contextes `ssh://`, ports liés à `127.0.0.1`, et un **cache de build par couche** qui montre
l'effet de l'ordre des instructions d'un Dockerfile.

Aucune base de données : la progression est enregistrée dans le `localStorage` du navigateur.
Aucune commande n'est exécutée sur la machine : tout est simulé.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script           | Rôle                                                 |
| ---------------- | ---------------------------------------------------- |
| `npm run dev`    | Serveur de développement                             |
| `npm run build`  | Build de production (`npm start` pour le lancer)     |
| `npm test`       | Tests : simulateur, parseur, cohérence du contenu    |
| `npm run lint`   | ESLint                                               |
| `npm run format` | Prettier                                             |

## Le terminal

| Raccourci     | Effet                                               |
| ------------- | --------------------------------------------------- |
| ↑ / ↓         | historique                                          |
| Tab           | complétion (commandes, conteneurs, images, fichiers) |
| Ctrl + C      | interrompre (`logs -f`, `run` attaché, `stats`…)    |
| Ctrl + L      | effacer l'écran (ou `clear`)                        |
| Ctrl + U      | effacer la ligne                                    |
| Clic droit    | coller — ou copier, si du texte est sélectionné     |

Le terminal ne dit jamais si la commande est « la bonne » : il répond comme Docker. L'étape est validée
dans le panneau de gauche quand la commande correspond à la consigne **et** qu'elle a réussi. Ce panneau
permet aussi d'afficher une aide ou la réponse.

## Architecture

```
src/
├── app/                          # Routes (App Router)
│   ├── page.tsx                  # Accueil
│   ├── aide-memoire/
│   ├── cas-pratiques/            # Liste et espace de travail [caseId]
│   └── modules/[moduleId]/       # Cours, exercices/[exerciseId], quiz
├── components/
│   ├── Terminal.tsx              # Émulateur de terminal (UI)
│   ├── CodeEditor.tsx
│   ├── course/                   # Markdown, vidéos, ressources, plan du module
│   ├── cases/                    # Espace de travail des cas pratiques (IDE, rapport)
│   ├── exercise/                 # Exercices terminal / fichier, liaison au simulateur
│   └── ui/                       # Boutons, icônes
└── lib/
    ├── simulator/                # Moteur Docker simulé
    │   ├── state.ts              # État initial, images, fichiers
    │   ├── args.ts               # Analyse des options + texte de --help
    │   ├── registry.ts           # Aiguillage des commandes docker
    │   ├── runtime.ts            # Cycle de vie des conteneurs
    │   ├── shell.ts              # Shell de l'hôte et des conteneurs
    │   ├── compose-file.ts       # Lecture des compose.yaml (interpolation, fusion, profils)
    │   └── commands/             # containers, images, build, storage, compose, hub, system, tools
    ├── content/                  # Un fichier par module, lessons/*.md, parcours (index.ts)
    ├── cases/                    # Cas pratiques : catalogue, vérifications, notation
    ├── command-parser.ts         # Comparaison d'une commande à la consigne
    ├── step-validation.ts
    └── progress.ts               # Progression (localStorage)
```

## Ajouter du contenu

- **Cours** : modifier `src/lib/content/lessons/<module>.md` (Markdown, tableaux acceptés).
- **Exercice terminal** : dans le fichier du module, une liste d'étapes et l'environnement de départ (`setup`) :

```ts
{
  id: "cycle-de-vie",
  kind: "command",
  setup: { containers: [{ name: "web", image: "nginx", ports: ["8080:80"] }] },
  steps: [
    {
      instruction: "Arrête le conteneur web.",
      rule: { prefixes: [["docker", "stop"], ["docker", "container", "stop"]], args: ["web"] },
      solution: "docker stop web",
      hint: "docker stop <nom>",
    },
  ],
}
```

Les options d'une règle sont acceptées dans n'importe quel ordre, avec leurs alias, `--option=valeur` et les options courtes groupées (`-it`).

- **Vidéos / ressources** : champs `videos` (identifiant YouTube) et `resources` du module.
- **Parcours** : tableau `tracks` de [src/lib/content/index.ts](src/lib/content/index.ts).
- **Cas pratique** : une entrée dans [src/lib/cases/catalog.ts](src/lib/cases/catalog.ts) avec le ticket (`brief`),
  l'environnement de départ (`setup`, qui accepte aussi des `commands` de préparation), des critères notés
  (`objectives`, dont la fonction `check` lit l'état du simulateur) totalisant 100 points, et une solution de référence.

Lance `npm test` après chaque ajout : les tests rejouent chaque solution dans le simulateur, vérifient que
toutes les étapes sont validées et que chaque cas pratique obtient 100/100 avec sa solution de référence
(et moins de 50 au départ).

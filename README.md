# Docker Playground

Plateforme locale pour apprendre la ligne de commande Docker par la pratique :

- **Cours** écrits pour chaque module, avec des vidéos (FR et EN) et une section « Aller plus loin » (documentation officielle, labs en ligne) ;
- **Terminal simulé** qui se comporte comme un vrai : état persistant (conteneurs, images, volumes, réseaux, fichiers), vraies sorties et vrais messages d'erreur de la CLI, questions interactives (`docker login`, confirmations `[y/N]`), shells dans les conteneurs (`docker exec -it … sh`), processus au premier plan interrompus par Ctrl+C ;
- **Éditeur** pour écrire des `Dockerfile`, `.dockerignore` et `compose.yaml` ;
- **Quiz** à la fin de chaque module, et un **aide-mémoire** filtrable.

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
│   └── modules/[moduleId]/       # Cours, exercices/[exerciseId], quiz
├── components/
│   ├── Terminal.tsx              # Émulateur de terminal (UI)
│   ├── CodeEditor.tsx
│   ├── course/                   # Markdown, vidéos, ressources, plan du module
│   ├── exercise/                 # Exercices terminal / fichier, liaison au simulateur
│   └── ui/                       # Boutons, icônes
└── lib/
    ├── simulator/                # Moteur Docker simulé
    │   ├── state.ts              # État initial, images, fichiers
    │   ├── args.ts               # Analyse des options + texte de --help
    │   ├── registry.ts           # Aiguillage des commandes docker
    │   ├── runtime.ts            # Cycle de vie des conteneurs
    │   ├── shell.ts              # Shell de l'hôte et des conteneurs
    │   └── commands/             # containers, images, build, storage, compose, hub, system
    ├── content/                  # Un fichier par module + lessons/*.md
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

Lance `npm test` après chaque ajout : les tests rejouent chaque solution dans le simulateur et
vérifient que toutes les étapes sont validées.

# 🐳 Docker Playground

Plateforme locale pour apprendre la ligne de commande Docker par la pratique :
un terminal simulé pour taper les commandes, un éditeur pour écrire des `Dockerfile`,
`.dockerignore` et `compose.yaml`, et un quiz à la fin de chaque module.

Aucune base de données : la progression est enregistrée dans le `localStorage` du navigateur.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
```

Version optimisée : `npm run build && npm start`.

| Script            | Rôle                                     |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Serveur de développement                 |
| `npm run build`   | Build de production                      |
| `npm start`       | Lance le build de production             |
| `npm test`        | Tests (parseur + cohérence du contenu)   |
| `npm run lint`    | ESLint                                   |

## Parcours

1. Premiers pas — `version`, `info`, `run hello-world`, `--help`
2. Les images — `pull`, `images`, `inspect`, `tag`, `history`, `rmi`, `prune`
3. Les conteneurs — `run -d -p --name`, `ps`, `logs`, `stop/start/rm`, `exec -it`, `-e`, `stats`
4. Dockerfile & build — écriture de Dockerfile, `.dockerignore`, multi-stage, `build -t -f`
5. Volumes & réseaux — volumes nommés, bind mounts, `network create/connect`
6. Docker Compose — écriture d'un `compose.yaml`, `up -d --build`, `ps`, `logs`, `exec`, `down -v`
7. Docker Hub — `search`, `login`, `tag`, `push`, `logout`
8. Nettoyage & Docker Desktop — `system df`, `prune`, `context`, `top`, `cp`

Une page **Aide-mémoire** récapitule les commandes essentielles.

> Le terminal est **simulé** : aucune commande n'est réellement exécutée sur ta machine.
> Tu peux ensuite reproduire les exercices dans un vrai terminal avec Docker Desktop.

## Architecture

```
src/
├── app/                                  # Routes (App Router)
│   ├── page.tsx                          # Accueil : liste des modules
│   ├── aide-memoire/page.tsx
│   └── modules/[moduleId]/
│       ├── page.tsx                      # Détail d'un module
│       ├── exercices/[exerciseId]/page.tsx
│       └── quiz/page.tsx
├── components/
│   ├── Terminal.tsx                      # Terminal simulé (UI pure)
│   ├── CodeEditor.tsx                    # Éditeur de fichier
│   ├── Quiz.tsx
│   └── exercise/                         # Logique des exercices
│       ├── ExercisePlayground.tsx
│       ├── CommandPlayground.tsx         # Exercices « terminal »
│       └── FilePlayground.tsx            # Exercices « fichier »
└── lib/
    ├── types.ts                          # Types du contenu
    ├── command-parser.ts                 # Validation des commandes saisies
    ├── progress.ts                       # Progression (localStorage)
    └── content/                          # Un fichier par module + aide-mémoire
```

## Ajouter du contenu

Tout le contenu se trouve dans [src/lib/content/](src/lib/content/). Pour ajouter un module,
crée un fichier sur le modèle des existants puis ajoute-le au tableau `modules` de
[src/lib/content/index.ts](src/lib/content/index.ts).

**Exercice terminal** (`kind: "command"`) : chaque étape décrit la commande attendue avec une règle.
Les options sont acceptées dans n'importe quel ordre, avec leurs alias, la syntaxe `--option=valeur`
et les options courtes groupées (`-it`).

```ts
{
  instruction: "Lance nginx en arrière-plan sur le port 8080.",
  rule: {
    prefixes: [["docker", "run"], ["docker", "container", "run"]],
    flags: [{ names: ["-d", "--detach"] }, { names: ["-p", "--publish"], value: "8080:80" }],
    args: ["nginx"],
  },
  solution: "docker run -d -p 8080:80 nginx",
  hint: "docker run -d -p <hôte>:<conteneur> <image>",
  output: "a3f1c9e5…", // sortie simulée affichée en cas de succès
}
```

**Exercice fichier** (`kind: "file"`) : une liste de vérifications par expression régulière.

Lance `npm test` après chaque ajout : les tests vérifient automatiquement que chaque solution
valide bien son exercice et que chaque réponse de quiz existe.

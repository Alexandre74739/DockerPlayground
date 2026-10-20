## Comment Docker décide de reconstruire

Chaque instruction d'un Dockerfile produit une **couche**. Avant d'exécuter une instruction, BuildKit calcule une clé à partir :

- de l'instruction elle-même (son texte exact) ;
- de la clé de la couche précédente ;
- pour `COPY` et `ADD`, du **contenu** des fichiers copiés.

Si la clé existe déjà, la couche est réutilisée : c'est la mention `CACHED` dans la sortie du build. Sinon, l'instruction est exécutée… **et toutes les suivantes aussi**, puisque leur clé dépend de celle-ci.

> **La règle d'or** — Place en haut ce qui change rarement (image de base, paquets système, dépendances), en bas ce qui change souvent (ton code).

## L'ordre qui fait gagner des minutes

**Mauvais** : la moindre modification de code invalide le `COPY . .`, donc l'installation des dépendances qui suit.

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm ci            # relancé à chaque modification de code
CMD ["node", "server.js"]
```

**Bon** : on copie d'abord **uniquement** les fichiers qui décrivent les dépendances.

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci            # relancé seulement si les dépendances changent
COPY . .
CMD ["node", "server.js"]
```

Le même principe vaut pour tous les langages :

| Langage | Fichiers à copier avant l'installation |
| --- | --- |
| Node.js | `package.json`, `package-lock.json` (ou `yarn.lock`, `pnpm-lock.yaml`) |
| Python | `requirements.txt` (ou `pyproject.toml` + `poetry.lock`) |
| PHP | `composer.json`, `composer.lock` |
| Java (Maven) | `pom.xml`, puis `mvn dependency:go-offline` |
| Go | `go.mod`, `go.sum`, puis `go mod download` |

## Les autres leviers d'optimisation

**Regrouper les commandes liées** dans un seul `RUN`, et nettoyer dans la même instruction : un fichier supprimé dans une couche suivante occupe toujours de la place dans la couche où il a été créé.

```dockerfile
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
```

**Utiliser des commandes reproductibles** : `npm ci` (respecte le fichier de verrouillage) plutôt que `npm install`, `pip install --no-cache-dir`.

**Conserver le cache des gestionnaires de paquets entre deux builds**, sans l'inclure dans l'image :

```dockerfile
RUN --mount=type=cache,target=/root/.npm npm ci
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
```

**Réduire le contexte de build** avec un `.dockerignore` : moins de fichiers à envoyer, et surtout moins de fichiers dont un changement invaliderait `COPY . .`.

**Séparer build et exécution** avec un build multi-étapes (voir le module Dockerfile) : l'image finale ne contient ni compilateur ni dépendances de développement.

## Le .dockerignore en détail

| Motif | Effet |
| --- | --- |
| `node_modules` | le dossier node_modules à la racine du contexte |
| `*.log` | les fichiers .log à la racine |
| `**/*.log` | les fichiers .log à n'importe quel niveau |
| `data/*` | le contenu du dossier data |
| `!data/reference.csv` | ré-inclut ce fichier malgré la règle précédente |
| `# commentaire` | ligne ignorée |

Les règles sont lues **dans l'ordre** et la dernière qui correspond l'emporte : une exception `!` doit donc être placée **après** la règle qu'elle contredit.

Un bon point de départ pour un projet Node.js :

```text
node_modules
.git
coverage
.env*
!.env.example
*.md
!README.md
**/*.log
Dockerfile*
compose*.yaml
```

> **Pourquoi exclure le Dockerfile ?** — Il n'est pas nécessaire dans l'image, et le modifier invaliderait inutilement `COPY . .`. Docker le lit quand même pour construire.

## Variables : ARG et ENV

```dockerfile
ARG NODE_VERSION=22                  # avant FROM : utilisable dans FROM
FROM node:${NODE_VERSION}-alpine

ARG APP_VERSION=dev                  # n'existe que pendant le build
ENV APP_VERSION=${APP_VERSION}       # recopiée : visible à l'exécution
```

```bash
docker build --build-arg NODE_VERSION=20 --build-arg APP_VERSION=1.4.2 -t api:1.4.2 .
```

> **Pas de secret dans un ARG** — sa valeur apparaît dans `docker history`. Pour un jeton, utilise `RUN --mount=type=secret`.

## ENTRYPOINT et CMD

| Dockerfile | `docker run image` | `docker run image worker.js` |
| --- | --- | --- |
| `CMD ["node", "server.js"]` | node server.js | worker.js (remplace tout) |
| `ENTRYPOINT ["node"]` + `CMD ["server.js"]` | node server.js | node worker.js |

Utilise la **forme JSON** (`["node", "server.js"]`) : le processus reçoit directement les signaux d'arrêt (`docker stop`), sans shell intermédiaire.

## Les métadonnées

```dockerfile
LABEL org.opencontainers.image.source=https://github.com/acme/api
LABEL org.opencontainers.image.description="API de facturation"
```

Ces étiquettes standard relient l'image à son dépôt de code : Docker Hub et GitHub les affichent.

## Vérifier automatiquement ses Dockerfile

[Hadolint](https://github.com/hadolint/hadolint) analyse un Dockerfile et signale les mauvaises pratiques (versions non épinglées, `apt-get` sans nettoyage, `cd` au lieu de `WORKDIR`…) :

```bash
docker run --rm -i hadolint/hadolint < Dockerfile
```

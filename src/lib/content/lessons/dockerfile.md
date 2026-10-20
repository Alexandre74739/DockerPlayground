## La recette d'une image

Un **Dockerfile** est un fichier texte, sans extension, placé à la racine du projet. Chaque ligne est une instruction exécutée dans l'ordre ; la plupart créent une nouvelle couche de l'image.

```dockerfile
FROM node:22-alpine          # image de départ

WORKDIR /app                 # dossier de travail (créé si besoin)

COPY package*.json ./        # copie des fichiers depuis ton projet
RUN npm install              # commande exécutée PENDANT le build

COPY . .                     # le reste du code

EXPOSE 3000                  # documente le port écouté
CMD ["node", "server.js"]    # commande lancée au DÉMARRAGE du conteneur
```

## Les instructions à connaître

| Instruction | Rôle |
| --- | --- |
| `FROM` | image de base, toujours en premier |
| `WORKDIR` | dossier courant pour les instructions suivantes |
| `COPY` | copie des fichiers du contexte de build vers l'image |
| `RUN` | exécute une commande au moment du build (installation…) |
| `ENV` | définit une variable d'environnement |
| `EXPOSE` | documente un port (ne le publie pas !) |
| `CMD` | commande par défaut au démarrage du conteneur |
| `ENTRYPOINT` | programme principal fixe, `CMD` devient alors ses arguments |

> **RUN ou CMD ?** — `RUN` s'exécute **une fois, pendant le build** (pour installer). `CMD` s'exécute **à chaque démarrage** d'un conteneur.

Préfère la forme JSON `CMD ["node", "server.js"]` à la forme shell `CMD node server.js` : le processus reçoit correctement les signaux d'arrêt.

## Construire

```bash
docker build -t mon-app .
docker build -t mon-app:1.0 .
docker build -f Dockerfile.prod -t mon-app:prod .
```

- `-t` donne un nom (et un tag) à l'image ;
- `-f` indique un Dockerfile qui ne s'appelle pas `Dockerfile` ;
- le `.` final est le **contexte de build** : le dossier envoyé au moteur. Les `COPY` ne peuvent lire que ce qui s'y trouve.

## Le cache, ton meilleur allié

Docker réutilise une couche tant que l'instruction et les fichiers qu'elle utilise n'ont pas changé (`CACHED` dans la sortie). D'où l'ordre classique : copier d'abord `package.json`, installer, **puis** copier le code. Modifier une ligne de code ne relance alors pas `npm install`.

## Le .dockerignore

Il fonctionne comme un `.gitignore` pour le contexte de build :

```text
node_modules
.git
.env
*.log
```

Résultat : des builds plus rapides, des images plus légères, et pas de secret (`.env`) embarqué par accident.

## Les builds multi-étapes

Pour une application qui se compile (React, TypeScript, Go…), on sépare la compilation de l'exécution :

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

L'image finale ne contient que nginx et les fichiers compilés : ni Node.js, ni `node_modules`, ni code source.

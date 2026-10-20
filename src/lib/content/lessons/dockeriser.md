## La méthode en cinq questions

Dockeriser une application, c'est répondre dans l'ordre à cinq questions. La réponse à chacune devient une instruction du Dockerfile.

| Question | Instruction |
| --- | --- |
| Sur quoi tourne-t-elle ? (langage, version) | `FROM node:22-alpine`, `FROM python:3.12-slim` |
| Où vit son code dans le conteneur ? | `WORKDIR /app` |
| De quoi dépend-elle ? | `COPY package*.json ./` puis `RUN npm ci` |
| Quel est son code ? | `COPY . .` |
| Comment la démarrer, sur quel port ? | `EXPOSE 3000`, `CMD ["node", "server.js"]` |

> **Règle d'or** — Une seule application par conteneur. Une API et sa base de données, ce sont deux conteneurs, reliés par un réseau (ou par Compose).

## Choisir l'image de base

Pars toujours de l'**image officielle du langage**, dans une version précise :

- `node:22-alpine`, `python:3.12-slim`, `eclipse-temurin:21-jre`, `golang:1.23` pour compiler…
- la variante `alpine` est la plus légère, `slim` est un bon compromis basé sur Debian ;
- évite `latest` : la même recette doit produire la même image dans six mois.

## Exemple : une API Node.js

```dockerfile
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev        # dépendances de production uniquement, en cache

COPY . .
USER node                    # ne pas tourner en root
EXPOSE 3000
CMD ["node", "server.js"]
```

## Exemple : une API Python (Flask, FastAPI…)

```dockerfile
FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["python", "app.py"]
```

Le principe est identique : **dépendances d'abord, code ensuite**, pour profiter du cache.

## Les pièges classiques

- **L'application écoute sur 127.0.0.1** : elle n'est joignable que depuis l'intérieur du conteneur. Configure-la pour écouter sur `0.0.0.0`.
- **Le dossier `node_modules` ou `.venv` local part dans l'image** : ajoute-le au `.dockerignore`.
- **Un fichier `.env` avec des secrets est copié** par `COPY . .` : même remède, `.dockerignore`.
- **L'application a besoin d'une base** : ne l'installe pas dans la même image, lance un conteneur `postgres` à côté.

## Valider de bout en bout

```bash
docker build -t mon-app .
docker run -d -p 3000:3000 --name mon-app mon-app
curl localhost:3000
docker logs mon-app
```

Si `curl` répond, l'application est dockerisée. Sinon, `docker logs` dit presque toujours pourquoi.

## docker init : un excellent point de départ

`docker init` détecte le langage du projet, pose quelques questions (version, commande de démarrage, port) et génère :

- un `Dockerfile` qui suit les bonnes pratiques (utilisateur non root, cache des dépendances) ;
- un `compose.yaml` prêt à lancer avec `docker compose up --build` ;
- un `.dockerignore` et un `README.Docker.md`.

> **Bon réflexe en entreprise** — Commence par `docker init`, relis chaque ligne générée et adapte-la. Tu gagnes du temps sans perdre la compréhension de ce qui est construit.

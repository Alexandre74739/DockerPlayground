## Une image, tous les environnements

La même image doit tourner en développement, en recette et en production. Ce qui change d'un environnement à l'autre (adresse de la base, clés d'API, niveau de logs) ne doit donc **pas** être dans l'image, mais fourni au démarrage : c'est le principe de la [configuration par l'environnement](https://12factor.net/fr/config).

## Passer des variables à un conteneur

```bash
docker run -e NODE_ENV=production -e LOG_LEVEL=info mon-api
docker run --env-file .env mon-api
```

Le fichier `.env` contient une variable par ligne :

```text
DATABASE_URL=postgres://app:s3cret@db:5432/app
NODE_ENV=production
```

Pour vérifier ce que voit réellement le conteneur :

```bash
docker exec mon-api printenv DATABASE_URL
docker inspect --format '{{.Config.Env}}' mon-api
```

## Dans Docker Compose : deux mécanismes différents

**1. L'interpolation** — Compose remplace `${VARIABLE}` dans le fichier par la valeur trouvée dans ton shell ou dans le fichier `.env` placé à côté de `compose.yaml` :

```yaml
services:
  api:
    image: acme/api:${TAG:-latest}      # latest si TAG est absent
  db:
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
```

**2. `env_file`** — injecte le contenu d'un fichier dans l'environnement du conteneur :

```yaml
services:
  api:
    env_file:
      - .env
```

| Syntaxe | Effet |
| --- | --- |
| `${VAR}` | valeur de VAR, vide (avec avertissement) si absente |
| `${VAR:-défaut}` | valeur par défaut si VAR est absente ou vide |
| `${VAR:?message}` | erreur bloquante si VAR est absente |

> **Toujours vérifier** — `docker compose config` affiche la configuration finale, variables résolues, et signale chaque variable manquante : `WARN The "DB_PASSWORD" variable is not set`.

## Ce qui ne doit jamais être versionné

Le dépôt Git est lu par toute l'équipe, la CI, parfois des prestataires. Il ne doit contenir **aucun secret** :

- ajoute `.env` au `.gitignore` **et** au `.dockerignore` ;
- versionne plutôt un `.env.example` avec des valeurs factices, qui documente les variables attendues ;
- en production, les secrets viennent de l'orchestrateur ou d'un coffre-fort (secrets GitHub, Vault, secrets Compose/Swarm…).

## Les secrets ne vont pas dans l'image

`ENV API_KEY=…` dans un Dockerfile grave la clé dans l'image : n'importe qui peut la lire avec `docker history` ou `docker inspect`. Pour un secret nécessaire **pendant le build** (jeton d'un registre npm privé, par exemple), on utilise un montage temporaire :

```dockerfile
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm ci
```

```bash
docker build --secret id=npm_token,src=.npm_token -t api .
```

Le secret est disponible pendant cette instruction uniquement et n'apparaît dans aucune couche.

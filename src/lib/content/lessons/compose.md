## Le problème

Une application réelle, c'est souvent une API, une base de données, un cache… Les lancer à la main demande une longue suite de `docker network create`, `docker volume create` et `docker run` avec des dizaines d'options. **Docker Compose** décrit tout cela dans un seul fichier versionnable.

## Le fichier compose.yaml

```yaml
services:
  web:
    build: .                 # construit l'image depuis le Dockerfile du dossier
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/postgres
    depends_on:
      - db

  db:
    image: postgres:16       # image existante sur Docker Hub
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Chaque entrée de `services` devient un conteneur. On y retrouve exactement les options de `docker run` : `ports` ↔ `-p`, `environment` ↔ `-e`, `volumes` ↔ `-v`.

> **YAML** — L'indentation se fait **uniquement avec des espaces** (2 par niveau). Une tabulation provoque une erreur.

## Ce que Compose fait pour toi

- il crée un **réseau dédié** au projet (`projet_default`) : `web` joint la base via l'hôte `db` ;
- il préfixe les noms avec le nom du dossier (`projet-web-1`, `projet_pgdata`) ;
- il démarre les services dans l'ordre de `depends_on`.

## Les commandes du quotidien

Toutes s'exécutent dans le dossier qui contient `compose.yaml` :

```bash
docker compose up -d           # crée et démarre tout en arrière-plan
docker compose ps              # état des services
docker compose logs -f web     # journaux d'un service
docker compose exec db sh      # shell dans un service
docker compose up -d --build   # reconstruit après une modification du code
docker compose down            # arrête et supprime conteneurs + réseau
docker compose down -v         # … et les volumes (données perdues !)
```

> **`docker compose` ou `docker-compose` ?** — `docker-compose` (avec un tiret) est l'ancienne version 1, abandonnée. Utilise `docker compose` (avec un espace), intégré à Docker Desktop.

## depends_on et le démarrage

`depends_on` garantit l'**ordre** de démarrage, pas que la base soit **prête** à accepter des connexions. Pour attendre réellement, on ajoute un `healthcheck` au service `db` et `condition: service_healthy` côté `web`.

## Dans Docker Desktop

L'onglet *Containers* regroupe les conteneurs d'un même projet Compose sous son nom : tu peux démarrer, arrêter ou consulter les journaux de toute la stack d'un clic.

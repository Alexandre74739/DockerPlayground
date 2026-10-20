## Démarrer dans le bon ordre

`depends_on` sous sa forme simple ne fait qu'**ordonner** le démarrage : l'API peut démarrer alors que Postgres initialise encore sa base, et planter. La solution : un `healthcheck` sur la dépendance et une condition.

```yaml
services:
  api:
    build: .
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5
```

`docker compose ps` affiche alors `Up 2 minutes (healthy)`. Les conditions possibles : `service_started`, `service_healthy`, `service_completed_successfully` (pour une migration qui doit se terminer avant le démarrage de l'API).

## Redémarrer automatiquement

```yaml
    restart: unless-stopped
```

Le conteneur redémarre après un crash ou un redémarrage de la machine, sauf si tu l'as arrêté toi-même. Revers de la médaille : une application qui plante au démarrage passe en boucle `Restarting (1)` — le réflexe reste `docker compose logs`.

## Un fichier par environnement

Le `compose.yaml` contient ce qui est **commun**. Les différences vont dans des fichiers complémentaires, fusionnés par Compose :

```text
compose.yaml            commun à tous
compose.override.yaml   chargé automatiquement : confort de développement
compose.prod.yaml       production, désigné explicitement
```

```bash
docker compose up -d                                          # compose.yaml + override
docker compose -f compose.yaml -f compose.prod.yaml up -d     # production
docker compose -f compose.yaml -f compose.prod.yaml config    # vérifier la fusion
```

Règles de fusion : les clés simples du dernier fichier remplacent les précédentes, les listes (ports, volumes) s'additionnent, les variables d'environnement se fusionnent.

> **Typiquement en override** — ports exposés pour le débogage, montage du code source (`./src:/app/src`), `NODE_ENV: development`. **En prod** — image publiée au lieu de `build`, `restart`, limites de ressources.

## Les profils : des services optionnels

```yaml
  adminer:
    image: adminer
    profiles: [tools]
```

```bash
docker compose up -d                    # sans adminer
docker compose --profile tools up -d    # avec
```

## Nommer le projet

Compose préfixe tout (conteneurs, réseau, volumes) par le nom du projet, par défaut le nom du dossier. Deux clones du même dépôt dans des dossiers de même nom se marcheraient dessus : fixe-le avec `name: mon-projet` en tête du fichier ou `docker compose -p mon-projet`.

## Développer confortablement

`docker compose watch` (avec une section `develop.watch` dans le service) synchronise le code modifié dans le conteneur, ou reconstruit l'image quand `package.json` change : plus besoin de relancer la stack à la main.

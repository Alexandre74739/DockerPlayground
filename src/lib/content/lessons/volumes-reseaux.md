## Les conteneurs sont éphémères

Un conteneur écrit dans sa propre couche, qui **disparaît avec lui** au `docker rm`. Pour une base de données, c'est inacceptable : il faut stocker les données en dehors du conteneur. Docker propose deux mécanismes.

## Les volumes nommés

Un volume est un espace de stockage **géré par Docker**, qui survit aux conteneurs.

```bash
docker volume create pgdata
docker run -d -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data postgres
docker volume ls
docker volume inspect pgdata
```

La syntaxe est `-v nom_du_volume:/chemin/dans/le/conteneur`. Tu peux supprimer le conteneur, en recréer un avec le même volume : les données sont toujours là.

> **Bon à savoir** — Si le volume n'existe pas, `docker run -v` le crée automatiquement.

## Les bind mounts

Un bind mount relie **un dossier de ta machine** à un dossier du conteneur. Toute modification d'un côté est visible immédiatement de l'autre : idéal en développement.

```bash
docker run -d -p 8080:80 -v ./site:/usr/share/nginx/html nginx
docker run -d -p 8081:80 -v ./site:/usr/share/nginx/html:ro nginx   # lecture seule
```

Comment Docker fait la différence ? Si la partie gauche **ressemble à un chemin** (`./`, `/`, `C:\`), c'est un bind mount ; si c'est un simple nom, c'est un volume.

| | Volume nommé | Bind mount |
| --- | --- | --- |
| Emplacement | géré par Docker | un dossier que tu choisis |
| Usage typique | données de base de données | code source en développement |
| Portabilité | identique partout | dépend de ta machine |

## Les réseaux

Chaque conteneur a sa propre interface réseau. Dans un conteneur, **`localhost` désigne le conteneur lui-même**, pas ta machine ni les autres conteneurs.

Sur un réseau créé par l'utilisateur, Docker fournit un **DNS interne** : les conteneurs se joignent par leur nom.

```bash
docker network create mon-reseau
docker run -d --name cache --network mon-reseau redis
docker run -d --name api   --network mon-reseau mon-api
# depuis api, Redis est joignable à l'adresse cache:6379
docker network connect mon-reseau autre-conteneur
docker network ls
```

> **Le réseau par défaut** — Les conteneurs lancés sans `--network` vont sur le réseau `bridge`, où la résolution par nom ne fonctionne pas. Crée toujours un réseau dédié pour une application à plusieurs conteneurs (ou utilise Compose, qui le fait pour toi).

## Joindre ta machine depuis un conteneur

Avec Docker Desktop, le nom spécial `host.docker.internal` pointe vers ta machine hôte : pratique pour qu'un conteneur appelle une API qui tourne en dehors de Docker.

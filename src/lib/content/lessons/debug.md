## Une méthode plutôt que des intuitions

Face à un problème, suis toujours le même chemin, du plus général au plus précis :

1. **État** — `docker ps -a` (ou `docker compose ps -a`) : le conteneur tourne-t-il ? `Exited (1)`, `Restarting`, `Created` ?
2. **Journaux** — `docker logs <conteneur>` : 9 fois sur 10, la cause est écrite.
3. **Configuration** — `docker inspect` : variables, ports, montages, réseaux, politique de redémarrage.
4. **Intérieur** — `docker exec -it <conteneur> sh` : le fichier est-il là ? le service répond-il ?
5. **Réseau** — les conteneurs partagent-ils un réseau ? le port est-il publié ?

## Lire un code de sortie

| Code | Signification courante |
| --- | --- |
| `0` | arrêt normal (le programme a fini son travail) |
| `1` | erreur de l'application : voir les journaux |
| `125` | erreur de Docker lui-même (option invalide, conflit de nom…) |
| `126` / `127` | commande non exécutable / introuvable dans l'image |
| `137` | tué (`docker kill`, ou mémoire insuffisante : *OOM killed*) |

```bash
docker inspect --format '{{.State.ExitCode}}' api
docker inspect --format '{{.State.OOMKilled}}' api
```

## Les erreurs réseau les plus fréquentes

**`getaddrinfo ENOTFOUND db`** — le nom `db` ne se résout pas. Les conteneurs ne sont pas sur un même réseau *défini par l'utilisateur* : le réseau `bridge` par défaut n'a pas de DNS.

```bash
docker network create app-net
docker network connect app-net db
docker network connect app-net api
```

**`ECONNREFUSED 127.0.0.1:5432`** — l'application cherche la base sur `localhost`, c'est-à-dire dans son propre conteneur. Utilise le nom du conteneur ou du service : `db:5432`.

**`port is already allocated`** — un autre conteneur (ou programme) publie déjà ce port de l'hôte. `docker ps` montre lequel dans la colonne PORTS.

> **Piège** — un `docker run` qui échoue sur le port laisse un conteneur à l'état `Created`. Relancer la même commande donne alors `Conflict. The container name is already in use` : il suffit de `docker start` ce conteneur une fois le port libéré.

## Extraire une information avec --format

```bash
docker inspect --format '{{.State.Status}}' web
docker inspect --format '{{.NetworkSettings.IPAddress}}' web
docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' web
docker inspect --format '{{json .Mounts}}' web
```

## Autres outils utiles

```bash
docker logs --tail 50 -f api        # les 50 dernières lignes, puis en direct
docker logs --since 10m api         # les 10 dernières minutes
docker top api                      # processus en cours
docker stats --no-stream            # mémoire et CPU
docker cp api:/app/logs/error.log . # récupérer un fichier
docker events                       # flux des événements du moteur
```

## Quand rien ne marche

- `docker compose config` : la configuration est-elle celle que tu crois ?
- `docker compose up` **sans** `-d` : les journaux de tous les services s'affichent au démarrage ;
- reconstruire sans cache, `docker compose build --no-cache`, élimine une couche obsolète ;
- en dernier recours dans Docker Desktop : *Troubleshoot → Restart Docker Desktop*.

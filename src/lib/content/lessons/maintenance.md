## Docker prend de la place

Chaque `docker pull`, chaque `docker build`, chaque conteneur arrêté occupe de l'espace disque. Au bout de quelques semaines, il n'est pas rare d'atteindre des dizaines de gigaoctets.

```bash
docker system df
```

La colonne **RECLAIMABLE** indique ce qui peut être récupéré sans toucher à ce qui est utilisé.

## Les commandes prune

| Commande | Ce qui est supprimé |
| --- | --- |
| `docker container prune` | conteneurs arrêtés |
| `docker image prune` | images pendantes (`<none>`) |
| `docker image prune -a` | toutes les images sans conteneur |
| `docker volume prune` | volumes **anonymes** inutilisés |
| `docker volume prune -a` | **tous** les volumes inutilisés, y compris nommés |
| `docker network prune` | réseaux inutilisés |
| `docker system prune` | conteneurs arrêtés, réseaux, images pendantes, cache de build |
| `docker system prune -a` | … et toutes les images inutilisées |

Chaque commande demande une confirmation `[y/N]` ; `-f` la saute.

> **Les volumes contiennent tes données** — C'est pour ça qu'ils ne sont jamais supprimés par défaut. Vérifie avec `docker volume ls` avant un `volume prune -a`.

## Les contextes

Un **contexte** indique à la CLI quel moteur Docker piloter. Docker Desktop crée le contexte `desktop-linux`.

```bash
docker context ls
docker context use desktop-linux
```

L'étoile `*` marque le contexte actif. Si tu as installé plusieurs outils Docker, ou si des commandes échouent alors que Docker Desktop tourne, c'est la première chose à vérifier.

## Autres commandes de diagnostic

```bash
docker top web                     # processus dans un conteneur
docker stats                       # ressources consommées en direct
docker cp web:/etc/nginx/nginx.conf .   # copie un fichier hors du conteneur
docker cp ./nginx.conf web:/etc/nginx/  # … ou vers le conteneur
```

## Docker Desktop au quotidien

| Onglet | Équivalent CLI |
| --- | --- |
| *Containers* | `docker ps -a`, `logs`, `exec`, `stop`, `rm` |
| *Images* | `docker images`, `rmi`, `pull` |
| *Volumes* | `docker volume ls`, `inspect`, `rm` |
| *Builds* | historique des `docker build` |

Dans **Settings → Resources**, tu peux limiter la mémoire et le CPU alloués au moteur, et **Troubleshoot** propose « Clean / Purge data » en dernier recours.

> **Pour aller plus loin** — Une fois ces bases acquises, la suite logique est l'orchestration (Kubernetes, ou Docker Swarm) et l'intégration continue (construire et publier ses images automatiquement).

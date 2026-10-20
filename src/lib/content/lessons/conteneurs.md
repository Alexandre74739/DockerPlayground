## docker run, la commande centrale

`docker run` crée un conteneur à partir d'une image **et** le démarre. Ses options principales :

| Option | Rôle |
| --- | --- |
| `-d` | détaché : le conteneur tourne en arrière-plan, le terminal est libéré |
| `-p 8080:80` | publie un port : **hôte:conteneur** |
| `--name web` | donne un nom (sinon Docker en invente un, comme `eager_turing`) |
| `-e CLE=valeur` | définit une variable d'environnement |
| `-it` | interactif + terminal : pour obtenir un shell |
| `--rm` | supprime le conteneur automatiquement quand il s'arrête |

```bash
docker run -d -p 8080:80 --name web nginx
```

Après cette commande, http://localhost:8080 affiche la page d'accueil de nginx.

> **Le piège des ports** — Le format est toujours `hôte:conteneur`. nginx écoute sur le port 80 *dans* le conteneur ; tu choisis librement le port de ta machine (8080 ici). Deux conteneurs ne peuvent pas publier le même port hôte : Docker répond `port is already allocated`.

## Mode attaché ou détaché

Sans `-d`, le terminal reste « attaché » au conteneur : tu vois ses journaux en direct et **Ctrl+C** l'arrête. Avec `-d`, Docker affiche seulement l'identifiant du conteneur et te rend la main.

## Observer

```bash
docker ps          # conteneurs en cours d'exécution
docker ps -a       # tous, y compris arrêtés
docker logs web    # journaux du conteneur
docker logs -f web # suivre les journaux en direct (Ctrl+C pour quitter)
docker inspect web # tous les détails (IP, variables, montages…)
docker stats       # consommation CPU / mémoire en temps réel
```

## Le cycle de vie

```text
 docker run ──► running ──docker stop──► exited ──docker rm──► (supprimé)
                   ▲                       │
                   └─────docker start──────┘
```

- `docker stop` demande poliment au processus de s'arrêter (signal SIGTERM), puis le force au bout de 10 secondes ;
- un conteneur arrêté **existe toujours** : ses fichiers sont conservés jusqu'à `docker rm` ;
- `docker rm -f` arrête et supprime en une seule commande.

## Entrer dans un conteneur

Pour explorer ou déboguer, on ouvre un shell :

```bash
docker run -it --rm ubuntu bash   # nouveau conteneur jetable avec un shell
docker exec -it web sh            # shell dans un conteneur DÉJÀ lancé
docker exec web ls /etc/nginx     # une commande ponctuelle, sans shell
```

Le prompt change (`root@4f2a9c1b3d5e:/#`) : tu es *dans* le conteneur. Tape `exit` pour revenir sur ta machine. Avec `docker run -it`, quitter le shell arrête le conteneur (c'était son processus principal) ; avec `docker exec`, le conteneur continue de tourner.

> **bash ou sh ?** — Les images Alpine n'ont pas `bash`. Si Docker répond `executable file not found`, essaie `sh`.

## Variables d'environnement

Beaucoup d'images se configurent par variables. PostgreSQL refuse même de démarrer sans mot de passe :

```bash
docker run -d --name db -e POSTGRES_PASSWORD=secret postgres
```

Si un conteneur s'arrête immédiatement (`Exited (1)` dans `docker ps -a`), le premier réflexe est `docker logs <nom>` : la cause y est presque toujours écrite.

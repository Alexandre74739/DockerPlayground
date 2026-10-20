## Anatomie d'un nom d'image

Une référence d'image se compose de plusieurs parties :

```text
docker.io/library/nginx:1.27-alpine
└──┬────┘ └──┬──┘ └─┬─┘ └────┬────┘
registre  compte  dépôt     tag
```

- le **registre** est `docker.io` (Docker Hub) par défaut, on l'omet presque toujours ;
- `library/` désigne les **images officielles** : on écrit simplement `nginx` ;
- le **tag** identifie une version. Sans tag, Docker utilise `latest`.

> **Attention** — `latest` n'est pas « la dernière version » de façon garantie : c'est juste le tag par défaut. En production, utilise toujours un tag explicite (`nginx:1.27`).

## Les couches (layers)

Une image est un empilement de **couches** en lecture seule, chacune correspondant à une étape de sa construction. Deux images basées sur la même image de base partagent ces couches sur ton disque : c'est pour ça qu'un deuxième téléchargement est souvent très rapide (`Already exists`).

```bash
docker history nginx   # affiche les couches et la commande qui les a créées
```

## Télécharger et lister

```bash
docker pull nginx               # tag latest
docker pull node:22-alpine      # tag précis
docker images                   # ou : docker image ls
```

La colonne **IMAGE ID** est l'identifiant unique. Deux lignes avec le même ID sont le même contenu sous deux noms différents.

Les variantes `-alpine` sont basées sur Alpine Linux, une distribution minimaliste : `node:22-alpine` pèse environ 160 Mo contre plus d'1 Go pour `node:22`. En contrepartie, elles n'ont pas `bash` (seulement `sh`).

## Inspecter

```bash
docker image inspect nginx
```

Le JSON renvoyé indique notamment la commande lancée par défaut (`Cmd`), les ports documentés (`ExposedPorts`), les variables d'environnement et l'architecture.

## Taguer

`docker tag` crée un **alias** : un nouveau nom qui pointe vers la même image, sans rien copier.

```bash
docker tag nginx mon-nginx:v1
```

C'est l'étape indispensable avant de publier sur Docker Hub, où l'image doit s'appeler `ton-compte/depot:tag`.

## Supprimer et faire le ménage

```bash
docker rmi mon-nginx:v1        # retire ce tag (supprime l'image si c'était le dernier)
docker image prune             # supprime les images « pendantes » (<none>:<none>)
docker image prune -a          # supprime toutes les images non utilisées par un conteneur
```

Docker refuse de supprimer une image utilisée par un conteneur, **même arrêté** : supprime d'abord le conteneur, ou force avec `-f` en connaissance de cause.

> **Dans Docker Desktop** — l'onglet *Images* liste les mêmes images, avec leur taille, et permet de les supprimer ou de lancer un conteneur d'un clic.

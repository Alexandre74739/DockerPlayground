## Pourquoi Docker ?

« Ça marche sur ma machine » : Docker règle ce problème en empaquetant une application **avec tout ce dont elle a besoin** (système de base, dépendances, configuration) dans un format standard. Le paquet tourne de la même façon sur ton PC, sur celui d'un collègue ou sur un serveur.

Contrairement à une machine virtuelle, un conteneur ne démarre pas un système d'exploitation complet : il partage le noyau Linux de la machine hôte. Il démarre donc en une fraction de seconde et ne pèse que quelques mégaoctets.

## Le vocabulaire essentiel

| Notion | En une phrase |
| --- | --- |
| **Image** | Un modèle en lecture seule : le « moule » d'une application (ex. `nginx`, `postgres`). |
| **Conteneur** | Une instance d'une image en cours d'exécution. On peut en lancer plusieurs à partir d'une même image. |
| **Registre** | Un serveur qui stocke des images. Le registre public par défaut est **Docker Hub**. |
| **Dockerfile** | La recette texte qui décrit comment construire une image. |
| **Moteur (Docker Engine)** | Le service qui crée et exécute réellement les conteneurs. |

## Comment ça s'articule

Quand tu tapes une commande `docker …`, tu utilises la **CLI** (le client). Elle envoie ta demande au **démon Docker** (le moteur), qui fait le travail : télécharger des images, créer des conteneurs, gérer les réseaux…

Sur Windows et macOS, **Docker Desktop** installe et fait tourner ce moteur pour toi (dans une petite machine virtuelle Linux, via WSL 2 sous Windows). Il ajoute une interface graphique qui affiche les mêmes conteneurs, images et volumes que la CLI : ce que tu crées en ligne de commande apparaît immédiatement dans Docker Desktop, et inversement.

> **À retenir** — Si une commande répond « Cannot connect to the Docker daemon », c'est presque toujours que Docker Desktop n'est pas démarré.

## Vérifier son installation

```bash
docker --version   # version de la CLI
docker version     # versions détaillées du client ET du serveur
docker info        # état du moteur : nombre de conteneurs, d'images, ressources…
```

`docker version` affiche deux blocs, **Client** et **Server**. Si le bloc Server manque ou affiche une erreur, le moteur ne répond pas.

## Ton premier conteneur

```bash
docker run hello-world
```

Cette commande fait quatre choses :

1. elle cherche l'image `hello-world` en local ;
2. ne la trouvant pas, elle la télécharge depuis Docker Hub (`Unable to find image … locally` puis `Pull complete`) ;
3. elle crée un conteneur à partir de cette image ;
4. elle le démarre : le programme affiche son message puis s'arrête.

Le conteneur s'arrête dès que son programme principal se termine. C'est une règle fondamentale : **un conteneur vit aussi longtemps que son processus principal**.

## Être autonome : l'aide intégrée

Personne ne connaît toutes les options par cœur. Le bon réflexe :

```bash
docker --help            # liste des commandes
docker run --help        # options d'une commande précise
docker container --help  # sous-commandes d'un groupe
```

Les commandes sont organisées en **groupes** (`container`, `image`, `volume`, `network`, `system`…). Les raccourcis historiques restent valables : `docker ps` équivaut à `docker container ls`, `docker images` à `docker image ls`.

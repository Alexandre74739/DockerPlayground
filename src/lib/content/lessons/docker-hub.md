## Le registre public

**Docker Hub** (hub.docker.com) est le registre utilisé par défaut par Docker : chaque `docker pull nginx` y télécharge l'image. Il héberge :

- les **Docker Official Images** (`nginx`, `postgres`, `node`…), maintenues et suivies côté sécurité ;
- les images d'éditeurs vérifiés (*Verified Publisher*) ;
- les images de la communauté, dont les tiennes.

> **Sécurité** — Privilégie toujours une image officielle ou vérifiée. Une image inconnue peut contenir n'importe quoi.

## Rechercher

```bash
docker search redis
docker search --filter is-official=true python
```

Le site web reste plus pratique pour lire la documentation d'une image : variables d'environnement acceptées, tags disponibles, ports utilisés…

## Publier une image, étape par étape

**1. Se connecter**

```bash
docker login
```

Utilise de préférence un **Personal Access Token** (Paramètres du compte → *Personal access tokens*) plutôt que ton mot de passe. Si tu es connecté dans Docker Desktop, la CLI l'est aussi.

**2. Nommer l'image avec ton identifiant**

Docker Hub range les images par compte : `identifiant/depot:tag`.

```bash
docker tag mon-app:1.0 alex/mon-app:1.0
```

**3. Pousser**

```bash
docker push alex/mon-app:1.0
```

Seules les couches absentes du registre sont envoyées (`Layer already exists` pour les autres).

**4. Gérer plusieurs tags**

```bash
docker tag alex/mon-app:1.0 alex/mon-app:latest
docker push --all-tags alex/mon-app
```

> **`denied: requested access to the resource is denied`** — Les trois causes classiques : tu n'es pas connecté, le nom ne commence pas par ton identifiant, ou tu as fait une faute de frappe dans celui-ci.

## Récupérer son image ailleurs

N'importe quelle machine (un serveur, un collègue) peut maintenant faire :

```bash
docker pull alex/mon-app:1.0
docker run -d -p 3000:3000 alex/mon-app:1.0
```

Un dépôt est **public** par défaut ; un compte gratuit permet aussi d'avoir un dépôt privé.

## Bonnes pratiques de tags

- versionne toujours (`1.0.0`, `1.0`, `1`) en plus de `latest` ;
- ne réutilise jamais un tag de version pour un contenu différent ;
- `docker logout` sur une machine partagée.

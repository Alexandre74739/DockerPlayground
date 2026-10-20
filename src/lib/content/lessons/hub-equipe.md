## Organisations et dépôts privés

En entreprise, les images appartiennent à une **organisation** Docker Hub (`acme/api`), pas à un compte personnel :

- les **équipes** de l'organisation reçoivent des droits par dépôt : lecture, écriture, administration ;
- un dépôt **privé** n'est visible qu'après `docker login` d'un membre autorisé ;
- un collègue qui quitte l'entreprise ne part pas avec les images.

```bash
docker login                      # avec un jeton d'accès personnel (PAT)
docker tag api:1.4.2 acme/api:1.4.2
docker push acme/api:1.4.2
```

`denied: requested access to the resource is denied` signifie : pas connecté, pas membre de l'organisation, ou faute de frappe dans le nom.

## Versionner ses images

On suit la [gestion sémantique de version](https://semver.org/lang/fr/) : `MAJEUR.MINEUR.CORRECTIF`.

| Tag | Évolue ? | Pour qui |
| --- | --- | --- |
| `1.4.2` | jamais | la production, les rollbacks |
| `1.4` | aux correctifs | qui veut les correctifs automatiquement |
| `1` | aux versions compatibles | outils internes |
| `latest` | à chaque version | essais locaux uniquement |

```bash
docker tag api:1.4.2 acme/api:1.4.2
docker tag api:1.4.2 acme/api:1.4
docker tag api:1.4.2 acme/api:latest
docker push --all-tags acme/api
```

> **Ne réécris jamais un tag de version.** Si `1.4.2` est bogué, publie `1.4.3`. Docker Hub permet d'ailleurs de rendre des tags immuables.

## Images multi-plateformes

Les serveurs sont souvent en `linux/amd64`, les Mac récents en `linux/arm64`. Une image multi-plateforme contient une variante par architecture sous un seul tag :

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t acme/api:2.0.0 --push .
docker buildx imagetools inspect acme/api:2.0.0
```

## Publier automatiquement depuis la CI

Personne ne devrait publier une image de production depuis son poste. Avec GitHub Actions, un tag Git `v2.0.0` déclenche la construction et la publication :

```yaml
name: docker
on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          push: true
          platforms: linux/amd64,linux/arm64
          tags: acme/api:${{ github.ref_name }}
```

Les identifiants sont dans **Settings → Secrets and variables → Actions** du dépôt GitHub. L'action `docker/metadata-action` peut générer automatiquement les tags `2.0.0`, `2.0`, `2` et `latest` à partir du tag Git.

## Sans registre : save et load

```bash
docker save -o api-1.4.2.tar api:1.4.2   # export
docker load -i api-1.4.2.tar             # import, sur une autre machine
```

Utile pour un serveur isolé d'Internet ou pour remettre un livrable figé à un client.

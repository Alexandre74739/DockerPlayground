## Réduire la surface d'attaque

Chaque paquet présent dans une image est une faille potentielle. La première mesure de sécurité est donc aussi une optimisation : **des images petites**.

| Image de base | Taille | Paquets | Vulnérabilités typiques |
| --- | --- | --- | --- |
| `node:22` | ~1,1 Go | ~490 | nombreuses |
| `node:22-slim` | ~220 Mo | ~110 | quelques-unes |
| `node:22-alpine` | ~160 Mo | ~35 | très peu |

## Le build multi-étapes au service de la sécurité

Les outils de compilation, le code source et les dépendances de développement n'ont rien à faire en production :

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER node
CMD ["node", "server.js"]
```

## Ne pas tourner en root

Par défaut, le processus d'un conteneur s'exécute en **root**. En cas de faille dans l'application, l'attaquant hérite de ces droits. Les images officielles fournissent souvent un utilisateur dédié (`node` pour Node.js) ; sinon, crée-le :

```dockerfile
RUN addgroup -S app && adduser -S app -G app
USER app
```

Vérification : `docker exec mon-api whoami`.

## Scanner ses images

Docker Scout compare les paquets d'une image aux bases de vulnérabilités connues (CVE) :

```bash
docker scout quickview mon-api:1.0        # résumé par gravité
docker scout cves mon-api:1.0             # détail
docker scout recommendations mon-api:1.0  # meilleure image de base
```

> **En CI** — Ajoute un scan à chaque build et fais échouer la pipeline au-delà d'un seuil (par exemple : aucune vulnérabilité critique).

## Limiter ce qu'un conteneur peut faire

```bash
docker run -d \
  --memory 256m --cpus 0.5 \   # pas plus de 256 Mo et d'un demi-cœur
  --read-only \                # système de fichiers en lecture seule
  --tmpfs /tmp \               # sauf /tmp, en mémoire
  mon-api
```

Sans limite, une fuite mémoire dans un conteneur peut faire tomber tous les autres services de la machine.

## La liste de contrôle

- image officielle, en version précise, variante `alpine` ou `slim` ;
- build multi-étapes, `npm ci --omit=dev` ou équivalent ;
- `USER` non root ;
- aucun secret dans le Dockerfile, `.env` dans le `.dockerignore` ;
- `HEALTHCHECK` pour que l'orchestrateur détecte une application bloquée ;
- scan Docker Scout en CI ;
- limites mémoire/CPU en production ;
- mises à jour régulières de l'image de base (reconstruire, c'est corriger).

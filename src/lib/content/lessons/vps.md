## Le scénario

Tu as loué un **VPS** (serveur privé virtuel) chez un hébergeur : une machine Ubuntu avec une adresse IP publique, un utilisateur et un mot de passe. Objectif : y faire tourner tes conteneurs de façon fiable et sûre.

| Étape | Outil |
| --- | --- |
| Se connecter de façon sûre | `ssh`, clés `ssh-keygen` / `ssh-copy-id` |
| Installer Docker | script `get.docker.com`, groupe `docker` |
| Déployer | `scp` + Compose sur le serveur, ou un contexte Docker `ssh://` |
| Exposer proprement | reverse proxy HTTPS, ports liés à `127.0.0.1` |
| Tenir dans la durée | `restart`, journaux, sauvegardes, mises à jour |

## SSH et les clés

```bash
ssh deploy@203.0.113.10
```

À la première connexion, SSH affiche l'**empreinte** du serveur et demande confirmation : elle est ensuite mémorisée dans `~/.ssh/known_hosts`. Si elle change un jour, SSH refuse de se connecter (signe possible d'une attaque).

Un mot de passe se devine ou se vole. On utilise une **paire de clés** :

```bash
ssh-keygen -t ed25519 -C "alex@acme.fr"   # crée ~/.ssh/id_ed25519 et id_ed25519.pub
ssh-copy-id deploy@203.0.113.10            # dépose la clé publique sur le serveur
ssh deploy@203.0.113.10                    # plus de mot de passe demandé
```

> **La clé privée ne quitte jamais ton poste.** Une fois la connexion par clé vérifiée, désactive l'authentification par mot de passe côté serveur (`PasswordAuthentication no` dans `/etc/ssh/sshd_config`).

Pour ne plus taper l'adresse, un alias dans `~/.ssh/config` :

```text
Host vps
  HostName 203.0.113.10
  User deploy
```

## Installer Docker sur le serveur

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh                 # Docker Engine + CLI + Compose + Buildx
sudo usermod -aG docker $USER         # utiliser docker sans sudo…
exit                                  # … à partir de la prochaine connexion
```

Le groupe `docker` donne des droits équivalents à root sur la machine : ne l'accorde qu'aux comptes d'administration.

## Méthode 1 : copier les fichiers et lancer Compose sur le serveur

```bash
scp compose.yaml .env deploy@203.0.113.10:~/app/
ssh deploy@203.0.113.10
cd app
docker compose pull        # récupère les images publiées sur Docker Hub
docker compose up -d
```

Les images sont **construites ailleurs** (sur ton poste ou en CI) et publiées sur un registre : le serveur se contente de les télécharger. Si elles sont privées, un `docker login` est nécessaire sur le serveur.

## Méthode 2 : un contexte Docker distant

```bash
docker context create vps --docker "host=ssh://deploy@203.0.113.10"
docker context use vps
docker compose up -d          # fichiers lus sur le poste, conteneurs créés sur le serveur
docker ps                     # conteneurs du serveur
docker context use default    # retour au moteur local
```

Ponctuellement, sans changer de contexte : `docker -H ssh://deploy@203.0.113.10 ps`. Le contexte s'appuie sur ta clé SSH : la connexion par clé doit fonctionner.

## Ne pas tout exposer

Sur un serveur, `-p 5432:5432` rend la base joignable **depuis tout Internet**. Et le pare-feu `ufw` ne te protège pas : Docker ajoute ses propres règles iptables, prioritaires.

```yaml
services:
  db:
    image: postgres:16
    ports:
      - "127.0.0.1:5432:5432"   # accessible seulement depuis le serveur
```

Mieux encore : **ne publie pas** le port de la base. Les autres conteneurs la joignent par le réseau Compose (`db:5432`) ; toi, par un tunnel SSH si besoin :

```bash
ssh -L 5432:localhost:5432 deploy@203.0.113.10
```

Vérifier depuis l'extérieur : `nc -zv 203.0.113.10 5432` doit échouer.

## HTTPS avec un reverse proxy

Seul un **reverse proxy** publie les ports 80 et 443 ; il obtient les certificats HTTPS et redirige vers les conteneurs. Exemple avec Caddy :

```yaml
services:
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
  api:
    image: acme/api:1.4.2       # aucun port publié
```

```text
api.acme.fr {
  reverse_proxy api:3000
}
```

## En production, au quotidien

- `restart: unless-stopped` sur chaque service : la stack redémarre avec le serveur ;
- limite la taille des journaux (`logging: { options: { max-size: "10m" } }`) pour ne pas remplir le disque ;
- **mettre à jour** : changer le tag dans `.env`, puis `docker compose pull && docker compose up -d` ;
- **revenir en arrière** : remettre l'ancien tag et relancer la même commande ;
- sauvegarder les **volumes** régulièrement, et faire le ménage (`docker image prune`) ;
- garder le système à jour (`unattended-upgrades` sur Ubuntu).

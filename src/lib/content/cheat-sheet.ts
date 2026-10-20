import type { CheatSheetSection } from "../types";

export const cheatSheet: CheatSheetSection[] = [
  {
    title: "Images",
    commands: [
      { command: "docker pull nginx:1.27", description: "Télécharger une image" },
      { command: "docker images", description: "Lister les images locales" },
      { command: "docker build -t app:1.0 .", description: "Construire une image depuis un Dockerfile" },
      { command: "docker tag app:1.0 user/app:1.0", description: "Ajouter un tag (alias)" },
      { command: "docker rmi app:1.0", description: "Supprimer une image" },
      { command: "docker image prune -a", description: "Supprimer les images inutilisées" },
      { command: "docker history nginx", description: "Voir les couches d'une image" },
    ],
  },
  {
    title: "Conteneurs",
    commands: [
      { command: "docker run -d -p 8080:80 --name web nginx", description: "Lancer en arrière-plan avec un port publié" },
      { command: "docker run -it --rm ubuntu bash", description: "Conteneur interactif jetable" },
      { command: "docker run -e KEY=value image", description: "Passer une variable d'environnement" },
      { command: "docker ps / docker ps -a", description: "Conteneurs actifs / tous" },
      { command: "docker stop | start | restart web", description: "Arrêter / démarrer / redémarrer" },
      { command: "docker rm -f web", description: "Supprimer (de force)" },
      { command: "docker logs -f web", description: "Suivre les logs" },
      { command: "docker exec -it web sh", description: "Ouvrir un shell dans un conteneur actif" },
      { command: "docker inspect web", description: "Détails JSON (IP, env, montages…)" },
      { command: "docker stats", description: "Consommation CPU / mémoire" },
      { command: "docker cp web:/chemin .", description: "Copier un fichier depuis/vers un conteneur" },
    ],
  },
  {
    title: "Volumes & réseaux",
    commands: [
      { command: "docker volume create data", description: "Créer un volume" },
      { command: "docker volume ls", description: "Lister les volumes" },
      { command: "docker run -v data:/app/data image", description: "Monter un volume nommé" },
      { command: "docker run -v ./src:/app/src image", description: "Monter un dossier local (bind mount)" },
      { command: "docker network create net", description: "Créer un réseau" },
      { command: "docker run --network net --name db postgres", description: "Lancer sur un réseau (joignable via « db »)" },
      { command: "docker network connect net api", description: "Connecter un conteneur existant" },
    ],
  },
  {
    title: "Docker Compose",
    commands: [
      { command: "docker compose up -d", description: "Démarrer la stack" },
      { command: "docker compose up -d --build", description: "Reconstruire puis démarrer" },
      { command: "docker compose ps", description: "État des services" },
      { command: "docker compose logs -f web", description: "Logs d'un service" },
      { command: "docker compose exec web sh", description: "Shell dans un service" },
      { command: "docker compose down", description: "Arrêter et supprimer (garde les volumes)" },
      { command: "docker compose down -v", description: "… et supprimer les volumes" },
    ],
  },
  {
    title: "Docker Hub",
    commands: [
      { command: "docker login / docker logout", description: "Se connecter / déconnecter" },
      { command: "docker search redis", description: "Rechercher une image" },
      { command: "docker push user/app:1.0", description: "Publier une image" },
      { command: "docker push --all-tags user/app", description: "Publier tous les tags" },
    ],
  },
  {
    title: "Système & Docker Desktop",
    commands: [
      { command: "docker version / docker info", description: "Version et état du moteur" },
      { command: "docker system df", description: "Espace disque utilisé" },
      { command: "docker system prune -a", description: "Grand ménage (hors volumes)" },
      { command: "docker context ls", description: "Lister les contextes (moteurs)" },
      { command: "docker <commande> --help", description: "Aide de n'importe quelle commande" },
    ],
  },
  {
    title: "Dockerfile",
    commands: [
      { command: "FROM node:22-alpine", description: "Image de base" },
      { command: "WORKDIR /app", description: "Dossier de travail" },
      { command: "COPY package*.json ./", description: "Copier des fichiers dans l'image" },
      { command: "RUN npm install", description: "Exécuter une commande au build" },
      { command: "ENV NODE_ENV=production", description: "Variable d'environnement" },
      { command: "EXPOSE 3000", description: "Documenter le port écouté" },
      { command: 'CMD ["node", "server.js"]', description: "Commande au démarrage" },
      { command: "COPY --from=build /app/dist ./dist", description: "Copier depuis une autre étape (multi-stage)" },
    ],
  },
];

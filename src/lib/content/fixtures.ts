import type { FileSystem } from "../simulator/types";

/** Fichiers d'exemple réutilisés par plusieurs exercices. */

export const API_FS: FileSystem = {
  "/app/package.json": '{\n  "name": "mon-api",\n  "main": "server.js",\n  "dependencies": { "express": "^4.21.1" }\n}',
  "/app/server.js":
    'const express = require("express");\nconst app = express();\napp.get("/", (req, res) => res.send("Hello from Docker!"));\napp.listen(3000, () => console.log("Server listening on http://0.0.0.0:3000"));',
  "/app/node_modules/express/package.json": '{ "name": "express", "version": "4.21.1" }',
};

export const PROJECT_FILES: FileSystem = {
  Dockerfile:
    'FROM node:22-alpine\n\nWORKDIR /app\n\nCOPY package*.json ./\nRUN npm install\n\nCOPY . .\n\nEXPOSE 3000\nCMD ["node", "server.js"]\n',
  "Dockerfile.prod":
    'FROM node:22-alpine\n\nENV NODE_ENV=production\nWORKDIR /app\n\nCOPY package*.json ./\nRUN npm ci --omit=dev\n\nCOPY . .\n\nEXPOSE 3000\nCMD ["node", "server.js"]\n',
  ".dockerignore": "node_modules\n.git\n.env\n*.log\n",
  "package.json":
    '{\n  "name": "mon-app",\n  "main": "server.js",\n  "scripts": { "start": "node server.js" },\n  "dependencies": { "express": "^4.21.1" }\n}\n',
  "package-lock.json": '{ "name": "mon-app", "lockfileVersion": 3 }\n',
  "server.js":
    'const express = require("express");\nconst app = express();\napp.get("/", (req, res) => res.send("Hello from Docker!"));\napp.listen(3000, () => console.log("Server listening on http://0.0.0.0:3000"));\n',
};

export const COMPOSE_FILE = `services:
  web:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`;

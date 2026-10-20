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

/** Petite application Flask utilisée par le module « Dockeriser une application ». */
export const FLASK_FILES: FileSystem = {
  "app.py": `from flask import Flask

app = Flask(__name__)


@app.get("/")
def index():
    return "Hello depuis Flask"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
`,
  "requirements.txt": "flask==3.0.3\n",
};

export const FLASK_DOCKERFILE = `FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["python", "app.py"]
`;

/** Code d'une API Node qui lit sa configuration dans l'environnement. */
export const API_SOURCE: FileSystem = {
  "package.json":
    '{\n  "name": "api",\n  "main": "server.js",\n  "scripts": { "start": "node server.js" },\n  "dependencies": { "express": "^4.21.1", "pg": "^8.13.1" }\n}\n',
  "package-lock.json": '{ "name": "api", "lockfileVersion": 3 }\n',
  "server.js": `const express = require("express");
const { Pool } = require("pg");

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();

app.get("/", async (req, res) => {
  const { rows } = await db.query("SELECT now()");
  res.send(\`API OK — \${rows[0].now}\`);
});

app.listen(3000, () => console.log("Server listening on http://0.0.0.0:3000"));
`,
  Dockerfile:
    'FROM node:22-alpine\n\nWORKDIR /app\n\nCOPY package*.json ./\nRUN npm ci --omit=dev\n\nCOPY . .\n\nUSER node\nEXPOSE 3000\nCMD ["node", "server.js"]\n',
  ".dockerignore": "node_modules\n.git\n.env\n*.log\n",
};

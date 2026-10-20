import { DAY, MB } from "./format";
import type { Container, FileSystem, ImageKind } from "./types";

/**
 * Images disponibles sur le « Docker Hub » simulé et comportement des
 * conteneurs qui en sont issus.
 */
export type CatalogEntry = {
  kind: Exclude<ImageKind, "app">;
  description: string;
  stars: number;
  size: number;
  alpineSize?: number;
  slimSize?: number;
  cmd: string[];
  workdir?: string;
  exposed?: string[];
  env?: string[];
  /** Le processus principal tourne en continu (serveur). */
  longRunning: boolean;
  /** Variable sans laquelle le conteneur s'arrête en erreur. */
  requiredEnv?: { names: string[]; error: string };
  fs?: FileSystem;
  layers: string[];
};

const OS_RELEASE = {
  debian: 'PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"\nNAME="Debian GNU/Linux"\nVERSION_ID="12"\nID=debian',
  ubuntu: 'PRETTY_NAME="Ubuntu 24.04.1 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nID=ubuntu',
  alpine: 'NAME="Alpine Linux"\nID=alpine\nVERSION_ID=3.20.3\nPRETTY_NAME="Alpine Linux v3.20"',
};

const NGINX_INDEX = `<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>
</body>
</html>`;

const NGINX_CONF = `user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log notice;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;
    include /etc/nginx/conf.d/*.conf;
}`;

export const catalog: Record<string, CatalogEntry> = {
  "hello-world": {
    kind: "hello-world",
    description: "Hello World! (an example of minimal Dockerization)",
    stars: 2300,
    size: 13_256,
    cmd: ["/hello"],
    longRunning: false,
    layers: ['CMD ["/hello"]', "COPY hello / # buildkit"],
  },
  nginx: {
    kind: "nginx",
    description: "Official build of Nginx.",
    stars: 20_600,
    size: 192 * MB,
    alpineSize: 52.5 * MB,
    cmd: ["nginx", "-g", "daemon off;"],
    exposed: ["80/tcp"],
    env: ["NGINX_VERSION=1.27.2"],
    longRunning: true,
    fs: {
      "/etc/nginx/nginx.conf": NGINX_CONF,
      "/etc/nginx/conf.d/default.conf":
        "server {\n    listen       80;\n    server_name  localhost;\n    location / {\n        root   /usr/share/nginx/html;\n        index  index.html;\n    }\n}",
      "/usr/share/nginx/html/index.html": NGINX_INDEX,
      "/usr/share/nginx/html/50x.html": "<h1>An error occurred.</h1>",
    },
    layers: [
      'CMD ["nginx" "-g" "daemon off;"]',
      "STOPSIGNAL SIGQUIT",
      "EXPOSE map[80/tcp:{}]",
      'ENTRYPOINT ["/docker-entrypoint.sh"]',
      "COPY docker-entrypoint.sh / # buildkit",
      "RUN /bin/sh -c set -x && groupadd --system nginx …",
      "ENV NGINX_VERSION=1.27.2",
      "# debian.sh --arch 'amd64' out/ 'bookworm' …",
    ],
  },
  node: {
    kind: "node",
    description: "Node.js is a JavaScript-based platform for server-side and networking applications.",
    stars: 13_700,
    size: 1.12 * 1000 * MB,
    alpineSize: 157 * MB,
    slimSize: 225 * MB,
    cmd: ["node"],
    env: ["NODE_VERSION=22.11.0", "YARN_VERSION=1.22.22"],
    longRunning: false,
    layers: [
      'CMD ["node"]',
      'ENTRYPOINT ["docker-entrypoint.sh"]',
      "ENV NODE_VERSION=22.11.0",
      "RUN /bin/sh -c groupadd --gid 1000 node …",
    ],
  },
  postgres: {
    kind: "postgres",
    description: "The PostgreSQL object-relational database system provides reliability and data integrity.",
    stars: 14_000,
    size: 438 * MB,
    alpineSize: 274 * MB,
    cmd: ["postgres"],
    exposed: ["5432/tcp"],
    env: ["PG_MAJOR=17", "PGDATA=/var/lib/postgresql/data"],
    longRunning: true,
    requiredEnv: {
      names: ["POSTGRES_PASSWORD"],
      error: `Error: Database is uninitialized and superuser password is not specified.
       You must specify POSTGRES_PASSWORD to a non-empty value for the
       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".`,
    },
    layers: [
      'CMD ["postgres"]',
      "EXPOSE map[5432/tcp:{}]",
      'ENTRYPOINT ["docker-entrypoint.sh"]',
      "VOLUME [/var/lib/postgresql/data]",
      "ENV PG_MAJOR=17",
    ],
  },
  redis: {
    kind: "redis",
    description: "Redis is the world's fastest data platform for caching, vector search, and NoSQL databases.",
    stars: 13_200,
    size: 117 * MB,
    alpineSize: 41.4 * MB,
    cmd: ["redis-server"],
    workdir: "/data",
    exposed: ["6379/tcp"],
    longRunning: true,
    layers: ['CMD ["redis-server"]', "EXPOSE map[6379/tcp:{}]", "WORKDIR /data", "VOLUME [/data]"],
  },
  ubuntu: {
    kind: "ubuntu",
    description: "Ubuntu is a Debian-based Linux operating system based on free software.",
    stars: 17_500,
    size: 78.1 * MB,
    cmd: ["/bin/bash"],
    longRunning: false,
    fs: { "/etc/os-release": OS_RELEASE.ubuntu },
    layers: ['CMD ["/bin/bash"]', "ADD file:… in /", "LABEL org.opencontainers.image.version=24.04"],
  },
  alpine: {
    kind: "alpine",
    description: "A minimal Docker image based on Alpine Linux with a complete package index and only 5 MB in size!",
    stars: 11_000,
    size: 7.8 * MB,
    cmd: ["/bin/sh"],
    longRunning: false,
    fs: { "/etc/os-release": OS_RELEASE.alpine },
    layers: ['CMD ["/bin/sh"]', "ADD alpine-minirootfs-3.20.3-x86_64.tar.gz / # buildkit"],
  },
  python: {
    kind: "python",
    description: "Python is an interpreted, interactive, object-oriented, open-source programming language.",
    stars: 9_900,
    size: 1.02 * 1000 * MB,
    alpineSize: 57.6 * MB,
    slimSize: 131 * MB,
    cmd: ["python3"],
    env: ["PYTHON_VERSION=3.13.0"],
    longRunning: false,
    layers: ['CMD ["python3"]', "ENV PYTHON_VERSION=3.13.0"],
  },
  httpd: {
    kind: "httpd",
    description: "The Apache HTTP Server Project",
    stars: 4_900,
    size: 148 * MB,
    alpineSize: 61.6 * MB,
    cmd: ["httpd-foreground"],
    exposed: ["80/tcp"],
    longRunning: true,
    fs: { "/usr/local/apache2/htdocs/index.html": "<html><body><h1>It works!</h1></body></html>" },
    layers: ['CMD ["httpd-foreground"]', "EXPOSE map[80/tcp:{}]"],
  },
  mysql: {
    kind: "mysql",
    description: "MySQL is a widely used, open-source relational database management system (RDBMS).",
    stars: 15_700,
    size: 602 * MB,
    cmd: ["mysqld"],
    exposed: ["3306/tcp", "33060/tcp"],
    longRunning: true,
    requiredEnv: {
      names: ["MYSQL_ROOT_PASSWORD", "MYSQL_ALLOW_EMPTY_PASSWORD", "MYSQL_RANDOM_ROOT_PASSWORD"],
      error: `[ERROR] [Entrypoint]: Database is uninitialized and password option is not specified
    You need to specify one of the following as an environment variable:
    - MYSQL_ROOT_PASSWORD
    - MYSQL_ALLOW_EMPTY_PASSWORD
    - MYSQL_RANDOM_ROOT_PASSWORD`,
    },
    layers: ['CMD ["mysqld"]', "EXPOSE map[3306/tcp:{} 33060/tcp:{}]"],
  },
  mongo: {
    kind: "mongo",
    description: "MongoDB document databases provide high availability and easy scalability.",
    stars: 10_400,
    size: 855 * MB,
    cmd: ["mongod"],
    exposed: ["27017/tcp"],
    longRunning: true,
    layers: ['CMD ["mongod"]', "EXPOSE map[27017/tcp:{}]"],
  },
};

/** Âge simulé des images publiées sur le Hub. */
export const PUBLISHED_AGO = 12 * DAY;

/** Shells présents dans une image. */
export function shellsFor(kind: ImageKind, alpine: boolean): ("sh" | "bash")[] {
  if (kind === "hello-world") return [];
  return alpine || kind === "alpine" ? ["sh"] : ["sh", "bash"];
}

export function osRelease(kind: ImageKind, alpine: boolean): string {
  if (alpine || kind === "alpine") return OS_RELEASE.alpine;
  return kind === "ubuntu" ? OS_RELEASE.ubuntu : OS_RELEASE.debian;
}

const HELLO = `
Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/`;

/** Journaux produits par un conteneur depuis son démarrage. */
export function logsFor(kind: ImageKind, container: Container): string {
  const date = new Date(container.createdAt);
  const stamp = date.toISOString().replace("T", " ").slice(0, 19).replace(/-/g, "/");
  switch (kind) {
    case "hello-world":
      return HELLO.trimStart();
    case "nginx":
      return `/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration
/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/
/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh
/docker-entrypoint.sh: Configuration complete; ready for start up
${stamp} [notice] 1#1: using the "epoll" event method
${stamp} [notice] 1#1: nginx/1.27.2
${stamp} [notice] 1#1: start worker processes
${stamp} [notice] 1#1: start worker process 29`;
    case "postgres":
      return `PostgreSQL init process complete; ready for start up.

${stamp}.512 UTC [1] LOG:  starting PostgreSQL 17.0 (Debian 17.0-1.pgdg120+1) on x86_64-pc-linux-gnu
${stamp}.513 UTC [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432
${stamp}.520 UTC [1] LOG:  database system is ready to accept connections`;
    case "redis":
      return `1:C ${date.toUTCString()} * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
1:M ${date.toUTCString()} * Running mode=standalone, port=6379.
1:M ${date.toUTCString()} * Server initialized
1:M ${date.toUTCString()} * Ready to accept connections tcp`;
    case "httpd":
      return `AH00558: httpd: Could not reliably determine the server's fully qualified domain name
[mpm_event:notice] [pid 1:tid 1] AH00489: Apache/2.4.62 (Unix) configured -- resuming normal operations`;
    case "mysql":
      return `[System] [MY-010931] [Server] /usr/sbin/mysqld: ready for connections. Version: '9.1.0'  socket: '/var/run/mysqld/mysqld.sock'  port: 3306`;
    case "mongo":
      return `{"t":{"$date":"${date.toISOString()}"},"s":"I","c":"NETWORK","msg":"Waiting for connections","attr":{"port":27017}}`;
    case "app":
      return `> node server.js\nServer listening on http://0.0.0.0:3000`;
    default:
      return "";
  }
}

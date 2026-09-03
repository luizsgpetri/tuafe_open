# tuafe

Backend for tuafe, built on [Strapi 5](https://docs.strapi.io/) (TypeScript) and run in a single
Docker container. There is no `docker compose` — everything is in the [Dockerfile](Dockerfile) and
the app starts with one `docker run`.

```
.
├── Dockerfile        # builds the image from ./backend
├── .dockerignore
└── backend/          # the Strapi application (source of truth)
```

## Requirements

- Docker (Desktop on macOS) with a few GB of free disk space
- A MySQL 8 database — on your machine, in another container, or remote
- Node.js 22 only if you want to run Strapi outside Docker

## 1. Configure the environment

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env`:

- **Secrets** — generate a fresh value for each one:

  ```bash
  openssl rand -base64 32
  ```

  `APP_KEYS` takes two or more comma-separated keys (`key1,key2`). Do not wrap values in quotes:
  Docker's `--env-file` keeps the quotes as part of the value. Values may contain `&`, `$` and
  similar characters — `--env-file` passes them through literally, but `source backend/.env` in a
  shell will choke on them.

- **Database** — `DATABASE_CLIENT=mysql` plus host, port, name, user and password.

`backend/.env` is never copied into the image (see [.dockerignore](.dockerignore)); it is passed at
run time with `--env-file`. Keep it out of git.

## 2. Provide a database

Strapi does not create the database — only its tables. Create an empty schema first:

```sql
CREATE DATABASE strapi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

If you want MySQL in Docker as well, run it on a shared network:

```bash
docker network create tuafe-net
```

```bash
docker run -d --name tuafe-mysql --network tuafe-net -e MYSQL_ROOT_PASSWORD=change-me -e MYSQL_DATABASE=strapi -e MYSQL_USER=strapi -e MYSQL_PASSWORD=change-me -v tuafe_mysql:/var/lib/mysql mysql:8
```

and set `DATABASE_HOST=tuafe-mysql` in `backend/.env`.

## 3. Build the image

Run this from the repository root — the build context is the root, not `backend/`.

```bash
docker build -t tuafe-strapi .
```

The container installs its own dependencies from `backend/package-lock.json`; your local
`backend/node_modules` is ignored (macOS binaries do not run in the Alpine container).

## 4. Run it

MySQL in a container, on the shared network:

```bash
docker run -d --name tuafe --network tuafe-net -p 1337:1337 --env-file backend/.env -e DATABASE_HOST=tuafe-mysql -e DATABASE_SSL=false -v tuafe_uploads:/opt/app/public/uploads tuafe-strapi
```

`DATABASE_SSL=false` is needed because the `mysql:8` image serves a self-signed certificate; drop
that override when pointing at a managed database that has a real one.

MySQL running directly on your Mac (`DATABASE_HOST=127.0.0.1` in the file points at the container
itself, so override it):

```bash
docker run -d --name tuafe -p 1337:1337 --env-file backend/.env -e DATABASE_HOST=host.docker.internal -v tuafe_uploads:/opt/app/public/uploads tuafe-strapi
```

Open http://localhost:1337/admin and create the first administrator. The API is served from
http://localhost:1337/api.

### Live editing

Mount your working tree so changes on the host restart the dev server:

```bash
docker run -d --name tuafe -p 1337:1337 --env-file backend/.env -e DATABASE_HOST=host.docker.internal -v "$PWD/backend/src:/opt/app/src" -v "$PWD/backend/config:/opt/app/config" -v tuafe_uploads:/opt/app/public/uploads tuafe-strapi
```

Dependencies live in `/opt/node_modules`, one level above the app, so mounting over `/opt/app`
does not hide them. Adding or removing a package still requires a rebuild.

## Everyday commands

| Task | Command |
|---|---|
| Follow the logs | `docker logs -f tuafe` |
| Stop | `docker stop tuafe` |
| Start again | `docker start tuafe` |
| Stop and remove | `docker rm -f tuafe` |
| Shell inside | `docker exec -it tuafe sh` |
| Strapi CLI | `docker exec -it tuafe npx strapi <command>` |
| Rebuild after changing dependencies | `docker rm -f tuafe && docker build -t tuafe-strapi . && docker run …` |

Uploaded media lives in the `tuafe_uploads` volume and survives `docker rm`. It is deleted only by
`docker volume rm tuafe_uploads`.

## Production image

```bash
docker build --build-arg NODE_ENV=production -t tuafe-strapi:prod .
```

```bash
docker run -d --name tuafe -p 127.0.0.1:1337:1337 --env-file backend/.env -v tuafe_uploads:/opt/app/public/uploads tuafe-strapi:prod sh -c "npm run build && npm run start"
```

Use different secrets from development, and never expose the admin panel without TLS in front.

## Running without Docker

```bash
cd backend && npm install && npm run develop
```

Same `backend/.env`, except `DATABASE_HOST` stays `127.0.0.1`.

## Troubleshooting

**`write /var/lib/.../meta.db: read-only file system`** — Docker's virtual disk is full, usually
because the host disk is. Reclaim space, then restart Docker Desktop:

```bash
docker builder prune -af && docker system prune -af
```

**`ECONNREFUSED 127.0.0.1:3306`** — the container is looking for MySQL inside itself. Use
`host.docker.internal` (database on the host) or the MySQL container's name on a shared network.

**`Error: self-signed certificate in certificate chain`** — `DATABASE_SSL=true` against a local
MySQL container. Run with `-e DATABASE_SSL=false`.

**`Missing apps keys`** — `APP_KEYS` is empty or malformed; it needs at least two comma-separated
values.

**Admin panel changes not showing** — the admin is rebuilt on start; watch `docker logs -f tuafe`
until the build finishes, then hard-reload the browser.

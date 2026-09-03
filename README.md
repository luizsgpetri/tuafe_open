# tuafe

Church community system: churches are managed in the Strapi admin panel, and
people join a church by scanning its invitation QR code.

Both apps run from a **single container** — there is no `docker compose`.

```
.
├── Dockerfile          # builds the front-end, then the runtime image with both apps
├── docker/
│   └── entrypoint.sh   # starts the front-end server and Strapi
├── backend/            # Strapi 5 (TypeScript) — API, admin panel, data model
└── frontend/           # React + Vite + Bootstrap — QR code, join form, login
```

| App | URL | What it is |
|---|---|---|
| Admin panel | http://localhost:1337/admin | Create churches, manage members, "Get QR Code" |
| API | http://localhost:1337/api | Strapi REST API |
| Front-end | http://localhost:3000 | Login, church profile, QR code, join form |

## How the church system works

- A **Church** is a content type: name, slug, description, address, email,
  phone, an `inviteToken`, and an `admins` relation.
- **Membership lives on the member**: the users-permissions user model is
  extended with a `churches` relation
  ([src/extensions/users-permissions](backend/src/extensions/users-permissions)),
  so joining a church writes to the user and a church's members are found by
  querying users. The church edit view shows administrators; a person's
  churches are on their own user record.
- The invite token is generated automatically when a church is created. It is
  the credential the public join flow uses, so it is random and unguessable.
- On the church's edit page in the admin panel, **Get QR Code** opens
  `/qr/<inviteToken>` in the front-end app.
- That page renders a QR code encoding `/join/<inviteToken>`. Scanning it opens
  a form asking for one thing: an email address.
- Submitting the form saves the church onto that person's user record,
  creating the user with the **Church Member** role if the email is new.
  Scanning twice is not an error.
- Two users-permissions roles are created on boot: **Church Admin** and
  **Church Member**.

### Front-end routes

| Route | Purpose |
|---|---|
| `/login` | Member / administrator login |
| `/churches` | Churches the logged in user belongs to |
| `/church/:token` | Public church profile |
| `/qr/:token` | Invitation QR code (target of the admin panel button) |
| `/join/:token` | Join form the QR code leads to |

### API endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/churches/invite/:token` | public | Church details behind an invitation |
| `POST /api/churches/join` | public | `{ token, email }` → adds the person to the church |
| `GET /api/churches/mine` | JWT | Churches of the logged in user, with `isAdmin` |
| `POST /api/auth/local` | public | Login (users-permissions) |

Church CRUD stays behind the admin panel: the public role has no permission on
the default `/api/churches` routes.

## Requirements

- Docker (Desktop on macOS) with a few GB of free disk space
- A MySQL 8 database — on your machine, in another container, or remote
- Node.js 22 only if you want to run the apps outside Docker

## 1. Configure the environment

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env`:

- **Secrets** — generate a fresh value for each one:

  ```bash
  openssl rand -base64 32
  ```

  `APP_KEYS` takes two or more comma-separated keys (`key1,key2`). Do not wrap
  values in quotes: Docker's `--env-file` keeps the quotes as part of the value.
  Values may contain `&`, `$` and similar characters — `--env-file` passes them
  through literally, but `source backend/.env` in a shell will choke on them.

- **Database** — `DATABASE_CLIENT=mysql` plus host, port, name, user and
  password.

`backend/.env` is never copied into the image (see [.dockerignore](.dockerignore));
it is passed at run time with `--env-file`. Keep it out of git.

## 2. Provide a database

Strapi does not create the database — only its tables. Create an empty schema
first:

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

Run this from the repository root — the build context is the root, not
`backend/`. The front-end is built during `docker build`; nothing is compiled at
run time except the Strapi admin panel.

```bash
docker build -t tuafe-strapi .
```

## 4. Run it

MySQL in a container, on the shared network:

```bash
docker run -d --name tuafe --network tuafe-net -p 1337:1337 -p 3000:3000 --env-file backend/.env -e DATABASE_HOST=tuafe-mysql -e DATABASE_SSL=false -v tuafe_uploads:/opt/app/public/uploads tuafe-strapi
```

MySQL running directly on your Mac (`DATABASE_HOST=127.0.0.1` in the file points
at the container itself, so override it):

```bash
docker run -d --name tuafe -p 1337:1337 -p 3000:3000 --env-file backend/.env -e DATABASE_HOST=host.docker.internal -e DATABASE_SSL=false -v tuafe_uploads:/opt/app/public/uploads tuafe-strapi
```

`DATABASE_SSL=false` is needed because the `mysql:8` image serves a self-signed
certificate; drop that override when pointing at a managed database that has a
real one.

Then:

1. Open http://localhost:1337/admin and create the first administrator.
2. Create a church under **Content Manager → Church**.
3. Save it, then press **Get QR Code** — http://localhost:3000/qr/&lt;token&gt;
   opens with the invitation code.
4. Scanning it (or opening http://localhost:3000/join/&lt;token&gt;) adds a
   member by email.

### Live editing

Mount your working tree so changes on the host restart the dev server:

```bash
docker run -d --name tuafe --network tuafe-net -p 1337:1337 -p 3000:3000 --env-file backend/.env -e DATABASE_HOST=tuafe-mysql -e DATABASE_SSL=false -v "$PWD/backend/src:/opt/app/src" -v "$PWD/backend/config:/opt/app/config" -v tuafe_uploads:/opt/app/public/uploads tuafe-strapi
```

Backend dependencies live in `/opt/node_modules`, one level above the app, so
mounting over `/opt/app` does not hide them. Adding or removing a package still
requires a rebuild. The front-end is served from the image as static files, so
front-end changes always need a rebuild (or `cd frontend && npm run dev`).

## Everyday commands

| Task | Command |
|---|---|
| Follow the logs | `docker logs -f tuafe` |
| Stop | `docker stop tuafe` |
| Start again | `docker start tuafe` |
| Stop and remove | `docker rm -f tuafe` |
| Shell inside | `docker exec -it tuafe sh` |
| Strapi CLI | `docker exec -it -e PORT=1399 tuafe npx strapi <command>` |
| Rebuild after changing code | `docker rm -f tuafe && docker build -t tuafe-strapi . && docker run …` |

Uploaded media lives in the `tuafe_uploads` volume and survives `docker rm`. It
is deleted only by `docker volume rm tuafe_uploads`.

## Production image

```bash
docker build --build-arg NODE_ENV=production --build-arg VITE_API_URL=https://api.example.com -t tuafe-strapi:prod .
```

The entrypoint builds the admin panel and runs `npm run start` when `NODE_ENV`
is `production`. Use different secrets from development, and never expose the
admin panel without TLS in front.

## Running without Docker

```bash
cd backend && npm install && npm run develop
```

```bash
cd frontend && npm install && npm run dev
```

Same `backend/.env`, except `DATABASE_HOST` stays `127.0.0.1`.

## Troubleshooting

**`write /var/lib/.../meta.db: read-only file system`** — Docker's virtual disk
is full, usually because the host disk is. Reclaim space, then restart Docker
Desktop:

```bash
docker builder prune -af && docker system prune -af
```

**`ECONNREFUSED 127.0.0.1:3306`** — the container is looking for MySQL inside
itself. Use `host.docker.internal` (database on the host) or the MySQL
container's name on a shared network.

**`Error: self-signed certificate in certificate chain`** — `DATABASE_SSL=true`
against a local MySQL container. Run with `-e DATABASE_SSL=false`.

**`Missing apps keys`** — `APP_KEYS` is empty or malformed; it needs at least
two comma-separated values.

**The front-end cannot reach the API** — the browser calls the API directly, so
the API origin must be in `CORS_ORIGINS` (see
[backend/config/middlewares.ts](backend/config/middlewares.ts)) and reachable
from the browser, not only from inside the container.

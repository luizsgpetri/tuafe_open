# syntax=docker/dockerfile:1
#
# One image, two apps (no docker compose):
#   - Strapi 5 backend  (./backend)  on port 1337
#   - React front-end   (./frontend) on port 3000
#
# Build context is the repository root.

# ---------------------------------------------------------------------------
# Stage 1 — build the front-end
# ---------------------------------------------------------------------------
FROM node:22-alpine AS frontend

WORKDIR /opt/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Left empty by default: the app then derives the API URL from the host it is
# opened on, which works for localhost and for the machine's LAN address.
ARG VITE_API_URL=""
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — runtime: Strapi + the built front-end
# ---------------------------------------------------------------------------
FROM node:22-alpine

# Native build deps required by Strapi (sharp/libvips, node-gyp)
RUN apk update && apk add --no-cache \
      build-base gcc autoconf automake zlib-dev libpng-dev bash vips-dev git

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV} \
    HOST=0.0.0.0 \
    PORT=1337 \
    FRONTEND_PORT=3000

# Backend dependencies live in /opt (one level above the app) so that
# bind-mounting ./backend over /opt/app for live editing does not hide them.
WORKDIR /opt
COPY backend/package.json backend/package-lock.json ./
RUN npm install -g node-gyp \
 && npm config set fetch-retry-maxtimeout 600000 -g \
 && npm ci

ENV PATH=/opt/node_modules/.bin:$PATH

WORKDIR /opt/app
COPY backend/ ./

# The front-end ships as static files plus a dependency-free Node server.
COPY --from=frontend /opt/frontend/dist /opt/frontend/dist
COPY frontend/server.mjs /opt/frontend/server.mjs
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Directories that should survive container recreation (mount volumes here)
RUN mkdir -p .tmp public/uploads \
 && chown -R node:node /opt/app /opt/frontend

USER node

EXPOSE 1337 3000

CMD ["/usr/local/bin/entrypoint.sh"]

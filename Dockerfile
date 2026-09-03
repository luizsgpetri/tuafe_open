# syntax=docker/dockerfile:1
#
# Strapi 5 image built from the ./backend source tree (no docker compose).
# Build context is the repo root; the app lives in ./backend.

FROM node:22-alpine

# Native build deps required by Strapi (sharp/libvips, node-gyp)
RUN apk update && apk add --no-cache \
      build-base gcc autoconf automake zlib-dev libpng-dev bash vips-dev git

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV} \
    HOST=0.0.0.0 \
    PORT=1337

# Dependencies live in /opt (one level above the app) so that bind-mounting
# ./backend over /opt/app for live editing does not hide node_modules.
WORKDIR /opt
COPY backend/package.json backend/package-lock.json ./
RUN npm install -g node-gyp \
 && npm config set fetch-retry-maxtimeout 600000 -g \
 && npm ci

ENV PATH=/opt/node_modules/.bin:$PATH

WORKDIR /opt/app
COPY backend/ ./

# Persisted / writable paths (mount volumes here)
RUN mkdir -p .tmp public/uploads \
 && chown -R node:node /opt/app

USER node

EXPOSE 1337

# Dev server with admin rebuild + hot reload.
# Production: build with --build-arg NODE_ENV=production and run
#   sh -c "npm run build && npm run start"
CMD ["npm", "run", "develop"]

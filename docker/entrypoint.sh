#!/bin/sh
#
# Starts both apps in the container: the static front-end server in the
# background, Strapi in the foreground so the container's lifetime follows it.
set -e

node /opt/frontend/server.mjs &

cd /opt/app

if [ "$NODE_ENV" = "production" ]; then
  # The admin panel is built at run time so the image works with whatever
  # database and secrets are supplied at `docker run`.
  npm run build
  exec npm run start
fi

exec npm run develop

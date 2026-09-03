# users-permissions extension

`content-types/user/schema.json` extends the plugin's user model with the
`churches` relation: church membership is stored on the member, not on the
church.

Strapi merges this file over the plugin's schema **shallowly**, so it repeats
the plugin's own fields verbatim. When upgrading `@strapi/plugin-users-permissions`,
compare it against the plugin's
`dist/server/content-types/user/index.js` and copy over any field that changed.

/**
 * Loaded before the core router (files are read in alphabetical order) so that
 * `/churches/invite/:token`, `/churches/join` and `/churches/mine` are matched
 * before the core `/churches/:id` route.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/churches/invite/:token',
      handler: 'church.invite',
      // Public on purpose: the invite token in the URL is the credential.
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/churches/join',
      handler: 'church.join',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/churches/mine',
      handler: 'church.mine',
    },
  ],
};

import type { Core } from '@strapi/strapi';

const ROLE_UID = 'plugin::users-permissions.role';
const PERMISSION_UID = 'plugin::users-permissions.permission';

/**
 * Roles a person can hold inside a church. They are regular
 * users-permissions roles so the standard login flow applies to both.
 */
const CHURCH_ROLES = [
  {
    type: 'church-admin',
    name: 'Church Admin',
    description: 'Administrates a church and can invite new members.',
  },
  {
    type: 'church-member',
    name: 'Church Member',
    description: 'Member of a church, added through an invitation QR code.',
  },
];

/**
 * Actions every logged in church person needs. The invite and join endpoints
 * are public by route config, so they are deliberately not listed here.
 */
const ROLE_ACTIONS: Record<string, string[]> = {
  authenticated: ['api::church.church.mine'],
  'church-admin': ['api::church.church.mine', 'api::church.church.findOne'],
  'church-member': ['api::church.church.mine'],
};

const ensureChurchRoles = async (strapi: Core.Strapi) => {
  for (const role of CHURCH_ROLES) {
    const existing = await strapi.db.query(ROLE_UID).findOne({ where: { type: role.type } });

    if (!existing) {
      await strapi.db.query(ROLE_UID).create({ data: role });
      strapi.log.info(`[church] created the "${role.name}" role`);
    }
  }
};

const ensureRolePermissions = async (strapi: Core.Strapi) => {
  for (const [type, actions] of Object.entries(ROLE_ACTIONS)) {
    const role = await strapi.db.query(ROLE_UID).findOne({ where: { type } });

    if (!role) {
      continue;
    }

    for (const action of actions) {
      const existing = await strapi.db
        .query(PERMISSION_UID)
        .findOne({ where: { action, role: role.id } });

      if (!existing) {
        await strapi.db.query(PERMISSION_UID).create({ data: { action, role: role.id } });
        strapi.log.info(`[church] granted "${action}" to the "${type}" role`);
      }
    }
  }
};

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * Church roles and their permissions are part of the data model rather than
   * something to set up by hand, so they are reconciled on every boot. Both
   * steps are idempotent.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureChurchRoles(strapi);
    await ensureRolePermissions(strapi);
  },
};

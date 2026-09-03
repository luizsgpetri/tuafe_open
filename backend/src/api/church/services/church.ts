import { factories } from '@strapi/strapi';
import { randomBytes } from 'node:crypto';
import { errors } from '@strapi/utils';

const CHURCH_UID = 'api::church.church';
const USER_UID = 'plugin::users-permissions.user';
const ROLE_UID = 'plugin::users-permissions.role';

export const CHURCH_MEMBER_ROLE = 'church-member';
export const CHURCH_ADMIN_ROLE = 'church-admin';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default factories.createCoreService(CHURCH_UID, ({ strapi }) => ({
  /**
   * The invite token is the only credential the public join flow has, so it is
   * looked up exactly, never partially.
   */
  async findByInviteToken(token: string) {
    if (!token) {
      return null;
    }

    const [church] = await strapi.documents(CHURCH_UID).findMany({
      filters: { inviteToken: token },
      populate: { members: { fields: ['id'] }, admins: { fields: ['id'] } },
      limit: 1,
    });

    return church ?? null;
  },

  async findRoleByType(type: string) {
    return strapi.db.query(ROLE_UID).findOne({ where: { type } });
  },

  /**
   * Adds the owner of `email` to the church behind `token`, creating the user
   * when this is their first invitation. Joining twice is not an error — the
   * QR code is public and people scan it more than once.
   */
  async joinByInviteToken(token: string, email: unknown) {
    const church = await this.findByInviteToken(token);

    if (!church) {
      throw new errors.NotFoundError('This invitation link is not valid.');
    }

    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
      throw new errors.ValidationError('A valid email address is required.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await strapi.db.query(USER_UID).findOne({ where: { email: normalizedEmail } });
    let userCreated = false;

    if (!user) {
      const role = await this.findRoleByType(CHURCH_MEMBER_ROLE);

      user = await strapi.documents(USER_UID).create({
        data: {
          username: normalizedEmail,
          email: normalizedEmail,
          // Members are invited, not registered: they set a real password
          // through the regular "forgot password" flow.
          password: randomBytes(24).toString('hex'),
          provider: 'local',
          confirmed: true,
          blocked: false,
          ...(role ? { role: role.id } : {}),
        },
      });

      userCreated = true;
    }

    const alreadyMember = (church.members ?? []).some(
      (member: { id: number }) => member.id === user.id
    );

    if (!alreadyMember) {
      await strapi.documents(CHURCH_UID).update({
        documentId: church.documentId,
        data: { members: { connect: [user.id] } },
      });
    }

    return { church, user, userCreated, alreadyMember };
  },

  /**
   * Churches the user belongs to, either as an administrator or as a member.
   */
  async findForUser(userId: number) {
    const churches = await strapi.documents(CHURCH_UID).findMany({
      filters: {
        $or: [{ admins: { id: userId } }, { members: { id: userId } }],
      },
      populate: { members: { fields: ['id'] }, admins: { fields: ['id'] } },
    });

    return churches.map((church: any) => ({
      ...this.toPublicChurch(church),
      inviteToken: church.inviteToken,
      isAdmin: (church.admins ?? []).some((admin: { id: number }) => admin.id === userId),
    }));
  },

  /**
   * Shape returned to unauthenticated visitors: everything needed to recognise
   * the church, nothing that identifies its members.
   */
  toPublicChurch(church: any) {
    return {
      documentId: church.documentId,
      name: church.name,
      slug: church.slug,
      description: church.description,
      address: church.address,
      email: church.email,
      phone: church.phone,
      memberCount: (church.members ?? []).length,
    };
  },
}));

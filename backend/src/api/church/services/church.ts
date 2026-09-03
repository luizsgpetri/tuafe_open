import { factories } from '@strapi/strapi';
import { randomBytes } from 'node:crypto';
import { errors } from '@strapi/utils';

const CHURCH_UID = 'api::church.church';
const USER_UID = 'plugin::users-permissions.user';
const ROLE_UID = 'plugin::users-permissions.role';

export const CHURCH_MEMBER_ROLE = 'church-member';
export const CHURCH_ADMIN_ROLE = 'church-admin';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Membership lives on the member: the user model owns the `churches` relation
 * (see src/extensions/users-permissions), so every read and write below goes
 * through the user, and a church's members are found by querying users.
 */
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
      populate: { admins: { fields: ['id'] } },
      limit: 1,
    });

    return church ?? null;
  },

  async findRoleByType(type: string) {
    return strapi.db.query(ROLE_UID).findOne({ where: { type } });
  },

  countMembers(churchId: number) {
    return strapi.db.query(USER_UID).count({ where: { churches: { id: churchId } } });
  },

  async isMember(userId: number, churchId: number) {
    const count = await strapi.db
      .query(USER_UID)
      .count({ where: { id: userId, churches: { id: churchId } } });

    return count > 0;
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
    let alreadyMember = false;

    if (user) {
      alreadyMember = await this.isMember(user.id, church.id);

      if (!alreadyMember) {
        // The membership is written on the member.
        await strapi.documents(USER_UID).update({
          documentId: user.documentId,
          data: { churches: { connect: [church.id] } },
        });
      }
    } else {
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
          churches: [church.id],
          ...(role ? { role: role.id } : {}),
        },
      });

      userCreated = true;
    }

    return { church, user, userCreated, alreadyMember };
  },

  /**
   * Churches the user belongs to, either as an administrator or as a member.
   */
  async findForUser(userId: number) {
    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      populate: { churches: { select: ['id'] } },
    });

    const memberChurchIds = (user?.churches ?? []).map((church: { id: number }) => church.id);

    const churches = await strapi.documents(CHURCH_UID).findMany({
      filters: {
        $or: [
          { admins: { id: userId } },
          // An empty list would match every church, so it is never sent.
          ...(memberChurchIds.length ? [{ id: { $in: memberChurchIds } }] : []),
        ],
      },
      populate: { admins: { fields: ['id'] } },
    });

    return Promise.all(
      churches.map(async (church: any) => ({
        ...(await this.toPublicChurch(church)),
        inviteToken: church.inviteToken,
        isAdmin: (church.admins ?? []).some((admin: { id: number }) => admin.id === userId),
      }))
    );
  },

  /**
   * Shape returned to unauthenticated visitors: everything needed to recognise
   * the church, nothing that identifies its members.
   */
  async toPublicChurch(church: any) {
    return {
      documentId: church.documentId,
      name: church.name,
      slug: church.slug,
      description: church.description,
      address: church.address,
      email: church.email,
      phone: church.phone,
      memberCount: await this.countMembers(church.id),
    };
  },
}));

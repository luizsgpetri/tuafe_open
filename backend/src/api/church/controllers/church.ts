import { factories } from '@strapi/strapi';

const CHURCH_UID = 'api::church.church';

export default factories.createCoreController(CHURCH_UID, ({ strapi }) => ({
  /**
   * GET /api/churches/invite/:token — public.
   * Backs both the QR code page and the join form, so it must work without a
   * session while exposing only public church details.
   */
  async invite(ctx) {
    const service = strapi.service(CHURCH_UID) as any;
    const church = await service.findByInviteToken(ctx.params.token);

    if (!church) {
      return ctx.notFound('This invitation link is not valid.');
    }

    ctx.body = { data: await service.toPublicChurch(church) };
  },

  /**
   * POST /api/churches/join — public.
   * Body: { token, email }
   */
  async join(ctx) {
    const { token, email } = (ctx.request.body ?? {}) as { token?: string; email?: string };
    const service = strapi.service(CHURCH_UID) as any;

    const { church, user, userCreated, alreadyMember } = await service.joinByInviteToken(
      token,
      email
    );

    ctx.body = {
      data: {
        church: await service.toPublicChurch(church),
        member: { email: user.email },
        userCreated,
        alreadyMember,
      },
    };
  },

  /**
   * GET /api/churches/mine — requires a logged in user.
   */
  async mine(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized();
    }

    const service = strapi.service(CHURCH_UID) as any;

    ctx.body = { data: await service.findForUser(user.id) };
  },
}));

import type { StrapiApp } from '@strapi/strapi/admin';

/**
 * Where the church front-end app is served. Both apps run in the same
 * container, so the default only differs from the admin panel by its port.
 */
const FRONTEND_URL =
  process.env.STRAPI_ADMIN_FRONTEND_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000`;

const CHURCH_MODEL = 'api::church.church';

/**
 * "Get QR Code" button on the edit view of a church. It opens the front-end
 * page that renders the invitation QR code for that specific church.
 */
const GetQrCodeAction = ({ model, document }: { model: string; document?: any }) => {
  if (model !== CHURCH_MODEL) {
    return null;
  }

  const inviteToken = document?.inviteToken;

  return {
    label: 'Get QR Code',
    // A church that was never saved has no invite token to encode yet.
    disabled: !inviteToken,
    position: ['panel' as const],
    onClick: () => {
      window.open(`${FRONTEND_URL}/qr/${inviteToken}`, '_blank', 'noopener,noreferrer');
    },
  };
};

export default {
  config: {},
  bootstrap(app: StrapiApp) {
    app
      .getPlugin('content-manager')
      .apis.addDocumentAction((actions: unknown[]) => [...actions, GetQrCodeAction]);
  },
};

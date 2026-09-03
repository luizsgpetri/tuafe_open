import { randomBytes } from 'node:crypto';

/**
 * Every church needs an invite token: it is what the QR code encodes and the
 * only thing the public join endpoint accepts, so it must never be guessable
 * and never be empty.
 */
const generateInviteToken = () => randomBytes(16).toString('hex');

/**
 * The admin panel fills the `slug` field from the name as you type, but
 * churches created through the API or a seed script arrive without one.
 */
const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default {
  beforeCreate(event: { params: { data?: Record<string, unknown> } }) {
    const { data } = event.params;

    if (data && !data.inviteToken) {
      data.inviteToken = generateInviteToken();
    }

    if (data && !data.slug && typeof data.name === 'string') {
      data.slug = slugify(data.name);
    }
  },

  beforeUpdate(event: { params: { data?: Record<string, unknown> } }) {
    const { data } = event.params;

    // Clearing the field in the admin panel regenerates a token instead of
    // leaving the church without a working QR code.
    if (data && 'inviteToken' in data && !data.inviteToken) {
      data.inviteToken = generateInviteToken();
    }
  },
};

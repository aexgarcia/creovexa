import type { SocialAccount } from '../types/social-account.types';

export const socialAccountsMock: SocialAccount[] = [
  {
    id: 'social-facebook',

    platform: 'FACEBOOK',

    accountName: 'Creovexa Business',

    username: 'creovexa',

    status: 'CONNECTED',

    connectedAt: '2026-09-18T10:30:00',

    expiresAt: '2026-11-18T10:30:00',

    lastError: null,
  },

  {
    id: 'social-instagram',

    platform: 'INSTAGRAM',

    accountName: 'Creovexa',

    username: '@creovexa',

    status: 'CONNECTED',

    connectedAt: '2026-09-18T10:35:00',

    expiresAt: '2026-11-18T10:35:00',

    lastError: null,
  },

  {
    id: 'social-tiktok',

    platform: 'TIKTOK',

    accountName: null,

    username: null,

    status: 'DISCONNECTED',

    connectedAt: null,

    expiresAt: null,

    lastError: null,
  },
];

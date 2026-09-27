import { socialAccountsMock } from '../mocks/social-accounts.mock';

import type { ConnectSocialAccountInput, SocialAccount } from '../types/social-account.types';

const socialAccounts = [...socialAccountsMock];

function delay(ms = 400) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

class SocialAccountService {
  async findAll(): Promise<SocialAccount[]> {
    await delay();

    return [...socialAccounts];
  }

  async findById(id: string): Promise<SocialAccount> {
    await delay();

    const account = socialAccounts.find((item) => item.id === id);

    if (!account) {
      throw new Error('Cuenta social no encontrada');
    }

    return account;
  }

  async connect(input: ConnectSocialAccountInput): Promise<SocialAccount> {
    await delay(800);

    const index = socialAccounts.findIndex((account) => account.platform === input.platform);

    if (index === -1) {
      throw new Error('Plataforma no encontrada');
    }

    const current = socialAccounts[index];

    const now = new Date().toISOString();

    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const updated: SocialAccount = {
      ...current,

      status: 'CONNECTED',

      accountName:
        input.platform === 'FACEBOOK'
          ? 'Creovexa Business'
          : input.platform === 'INSTAGRAM'
            ? 'Creovexa'
            : 'Creovexa TikTok',

      username:
        input.platform === 'FACEBOOK'
          ? 'creovexa'
          : input.platform === 'INSTAGRAM'
            ? '@creovexa'
            : '@creovexa',

      connectedAt: now,

      expiresAt,

      lastError: null,
    };

    socialAccounts[index] = updated;

    return updated;
  }

  async disconnect(id: string): Promise<SocialAccount> {
    await delay(600);

    const index = socialAccounts.findIndex((account) => account.id === id);

    if (index === -1) {
      throw new Error('Cuenta social no encontrada');
    }

    const current = socialAccounts[index];

    const updated: SocialAccount = {
      ...current,

      status: 'DISCONNECTED',

      accountName: null,

      username: null,

      connectedAt: null,

      expiresAt: null,

      lastError: null,
    };

    socialAccounts[index] = updated;

    return updated;
  }
}

export const socialAccountService = new SocialAccountService();

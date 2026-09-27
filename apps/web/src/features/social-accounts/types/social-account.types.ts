export type SocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK';

export type SocialAccountStatus = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR';

export interface SocialAccount {
  id: string;

  platform: SocialPlatform;

  accountName: string | null;

  username: string | null;

  status: SocialAccountStatus;

  connectedAt: string | null;

  expiresAt: string | null;

  lastError: string | null;
}

export interface ConnectSocialAccountInput {
  platform: SocialPlatform;
}

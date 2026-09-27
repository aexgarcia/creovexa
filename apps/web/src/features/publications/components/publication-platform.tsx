import type { IconType } from 'react-icons';

import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa6';

import type { SocialPlatform } from '@/features/campaigns/types/campaign.types';

interface PublicationPlatformProps {
  platform: SocialPlatform;
}

const platformConfig: Record<
  SocialPlatform,
  {
    label: string;
    icon: IconType;
  }
> = {
  FACEBOOK: {
    label: 'Facebook',
    icon: FaFacebookF,
  },

  INSTAGRAM: {
    label: 'Instagram',
    icon: FaInstagram,
  },

  TIKTOK: {
    label: 'TikTok',
    icon: FaTiktok,
  },
};

export function PublicationPlatform({ platform }: PublicationPlatformProps) {
  const config = platformConfig[platform];

  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4" />
      </div>

      <span className="font-medium">{config.label}</span>
    </div>
  );
}

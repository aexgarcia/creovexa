import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa6';

const platforms = {
  FACEBOOK: { label: 'Facebook', icon: FaFacebookF, color: 'bg-[#1877f2]/15 text-[#1877f2]' },
  INSTAGRAM: { label: 'Instagram', icon: FaInstagram, color: 'bg-[#e1306c]/15 text-[#e1306c]' },
  TIKTOK: { label: 'TikTok', icon: FaTiktok, color: 'border bg-control text-foreground' },
};

export function PublicationPlatform({ platform }: { platform: string }) {
  const config = platforms[platform as keyof typeof platforms];
  if (!config) return <span className="break-all text-sm">{platform}</span>;
  const Icon = config.icon;
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${config.color}`}
      >
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="text-sm font-medium">{config.label}</span>
    </span>
  );
}

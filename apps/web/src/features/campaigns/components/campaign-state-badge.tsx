import {
  CircleDashed,
  LoaderCircle,
  Clock3,
  CircleCheck,
  CheckCheck,
  CircleAlert,
  CircleX,
} from 'lucide-react';
import { campaignStatusLabels, type StoredCampaignStatus } from '../types/stored-campaign.types';

const appearance: Record<
  StoredCampaignStatus,
  { color: string; icon: typeof CircleDashed; busy?: boolean }
> = {
  DRAFT: { color: 'border-border bg-secondary text-muted-foreground', icon: CircleDashed },
  GENERATING: {
    color: 'border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan',
    icon: LoaderCircle,
    busy: true,
  },
  PENDING_APPROVAL: { color: 'border-amber-400/25 bg-amber-400/10 text-amber-300', icon: Clock3 },
  APPROVED: {
    color: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    icon: CircleCheck,
  },
  PUBLISHING: {
    color: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
    icon: LoaderCircle,
    busy: true,
  },
  PUBLISHED: {
    color: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    icon: CheckCheck,
  },
  PARTIALLY_PUBLISHED: {
    color: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    icon: CircleAlert,
  },
  FAILED: { color: 'border-rose-400/25 bg-rose-400/10 text-rose-300', icon: CircleX },
};

export function CampaignStateBadge({ status }: { status: StoredCampaignStatus }) {
  const { color, icon: Icon, busy } = appearance[status];
  return (
    <span
      className={
        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-snug font-medium ' +
        color
      }
    >
      <Icon
        aria-hidden="true"
        className={'size-3 shrink-0 ' + (busy ? 'animate-spin motion-reduce:animate-none' : '')}
      />
      <span>{campaignStatusLabels[status]}</span>
    </span>
  );
}

import { Badge } from '@/components/ui/badge';

import type { PublicationStatus } from '@/features/campaigns/types/campaign.types';

interface PublicationStatusBadgeProps {
  status: PublicationStatus;
}

const labels: Record<PublicationStatus, string> = {
  PENDING: 'Pendiente',

  PUBLISHING: 'Publicando',

  PUBLISHED: 'Publicada',

  FAILED: 'Fallida',
};

export function PublicationStatusBadge({ status }: PublicationStatusBadgeProps) {
  if (status === 'FAILED') {
    return <Badge variant="destructive">{labels[status]}</Badge>;
  }

  if (status === 'PUBLISHED') {
    return <Badge>{labels[status]}</Badge>;
  }

  return <Badge variant="secondary">{labels[status]}</Badge>;
}

import { Badge } from '@/components/ui/badge';

import type { CampaignStatus } from '../types/dashboard.types';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}

const statusLabels: Record<CampaignStatus, string> = {
  DRAFT: 'Borrador',
  GENERATING_COPY: 'Generando copy',
  GENERATING_IMAGE: 'Generando imagen',
  PENDING_APPROVAL: 'Pendiente',
  APPROVED: 'Aprobada',
  PUBLISHING: 'Publicando',
  PUBLISHED: 'Publicada',
  FAILED: 'Fallida',
};

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const variant =
    status === 'FAILED' ? 'destructive' : status === 'PUBLISHED' ? 'default' : 'secondary';

  return <Badge variant={variant}>{statusLabels[status]}</Badge>;
}

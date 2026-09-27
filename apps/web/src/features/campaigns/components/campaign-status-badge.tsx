import { Badge } from '@/components/ui/badge';

import type { CampaignStatus } from '../types/campaign.types';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}

const labels: Record<CampaignStatus, string> = {
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
  if (status === 'FAILED') {
    return <Badge variant="destructive">{labels[status]}</Badge>;
  }

  if (status === 'PUBLISHED') {
    return <Badge>{labels[status]}</Badge>;
  }

  if (status === 'PENDING_APPROVAL') {
    return <Badge className="bg-yellow-700 text-white">{labels[status]}</Badge>;
  }

  if (status === 'APPROVED') {
    return (
      <Badge className="bg-green-950 text-green-300" variant="outline">
        {labels[status]}
      </Badge>
    );
  }

  return <Badge variant="secondary">{labels[status]}</Badge>;
}

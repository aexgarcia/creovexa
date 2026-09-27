import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { Campaign } from '../types/campaign.types';

import { CampaignActions } from './campaign-actions';
import { CampaignStatusBadge } from './campaign-status-badge';

interface CampaignTableProps {
  campaigns: Campaign[];
}

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function CampaignTable({ campaigns }: CampaignTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaña</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Plantilla</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Finaliza</TableHead>
            <TableHead>Actualizada</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium">{campaign.name}</TableCell>

              <TableCell className="text-muted-foreground">{campaign.productName}</TableCell>

              <TableCell className="text-muted-foreground">{campaign.templateName}</TableCell>

              <TableCell>
                <CampaignStatusBadge status={campaign.status} />
              </TableCell>

              <TableCell className="text-muted-foreground">
                {formatDate(campaign.promotionEnd)}
              </TableCell>

              <TableCell className="text-muted-foreground">
                {formatDate(campaign.updatedAt)}
              </TableCell>

              <TableCell>
                <CampaignActions campaignId={campaign.id} status={campaign.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

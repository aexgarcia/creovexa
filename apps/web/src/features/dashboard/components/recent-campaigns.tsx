import Link from 'next/link';

import { ArrowUpRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { DashboardCampaign } from '../types/dashboard.types';

import { CampaignStatusBadge } from './campaign-status-badge';

interface RecentCampaignsProps {
  campaigns: DashboardCampaign[];
}

export function RecentCampaigns({ campaigns }: RecentCampaignsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Campañas recientes</CardTitle>

          <CardDescription>Últimas campañas creadas en la plataforma.</CardDescription>
        </div>

        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          render={<Link href="/campaigns" />}
        >
          Ver todas
          <ArrowUpRight className="ml-2 size-4" />
        </Button>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaña</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Fecha</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium">{campaign.name}</TableCell>

                <TableCell className="text-muted-foreground">{campaign.productName}</TableCell>

                <TableCell>
                  <CampaignStatusBadge status={campaign.status} />
                </TableCell>

                <TableCell className="text-right text-muted-foreground">
                  {new Intl.DateTimeFormat('es-PE', {
                    day: '2-digit',
                    month: 'short',
                  }).format(new Date(campaign.createdAt))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

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

import type { DashboardSummary } from '../services/dashboard.service';

import { Badge } from '@/components/ui/badge';
import { campaignStatusLabels } from '@/features/campaigns/types/stored-campaign.types';

interface RecentCampaignsProps {
  campaigns: DashboardSummary['recentCampaigns'];
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
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Fecha</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  Crea tu primera campaña para verla aquí.
                </TableCell>
              </TableRow>
            )}
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium">
                  <Link href={'/campaigns/' + campaign.id} className="hover:underline">
                    {campaign.title}
                  </Link>
                </TableCell>

                <TableCell>
                  <Badge variant="secondary">{campaignStatusLabels[campaign.status]}</Badge>
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

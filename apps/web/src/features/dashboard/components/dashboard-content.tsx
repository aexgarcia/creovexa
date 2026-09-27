'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { useDashboard } from '../hooks/use-dashboard';

import { CampaignOverview } from './campaign-overview';
import { DashboardStats } from './dashboard-stats';
import { PublicationSummary } from './publication-summary';
import { RecentActivity } from './recent-activity';
import { RecentCampaigns } from './recent-campaigns';

export function DashboardContent() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground">Cargando dashboard...</div>;
  }

  if (isError || !data) {
    return (
      <div className="py-20 text-center text-destructive">No se pudo cargar el dashboard.</div>
    );
  }

  return (
    <div className="space-y-8">
      <p role="note" className="rounded-lg border bg-muted p-4 text-sm">
        Vista de demostración: las métricas y actividades son ejemplos; todavía no reflejan tus
        campañas.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Resumen general de tu plataforma de marketing.
          </p>
        </div>

        <Button nativeButton={false} render={<Link href="/campaigns/new" />}>
          <Plus className="mr-2 size-4" />
          Nueva campaña
        </Button>
      </div>

      <DashboardStats metrics={data.metrics} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <CampaignOverview data={data.campaignStatus} />

        <PublicationSummary publications={data.publications} />
      </div>

      <RecentCampaigns campaigns={data.recentCampaigns} />

      <RecentActivity activities={data.recentActivity} />
    </div>
  );
}

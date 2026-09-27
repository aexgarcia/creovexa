'use client';
import Link from 'next/link';
import { Plus, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { useDashboard } from '../hooks/use-dashboard';
import { DashboardStats } from './dashboard-stats';
import { CampaignOverview } from './campaign-overview';
import { PublicationSummary } from './publication-summary';
import { RecentCampaigns } from './recent-campaigns';
export function DashboardContent() {
  const { data, isLoading, error, refetch } = useDashboard();
  if (isLoading)
    return (
      <div role="status" aria-label="Cargando dashboard" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  if (error || !data)
    return (
      <div role="alert" className="space-y-3 rounded-xl border p-6">
        <p>{error?.message ?? 'No se pudo cargar el dashboard.'}</p>
        <Button onClick={() => void refetch()}>Reintentar</Button>
      </div>
    );
  const publications = (['FACEBOOK', 'INSTAGRAM', 'TIKTOK'] as const).map((platform) => {
    const count = (statuses: string[]) =>
      data.publicationsByPlatform
        .filter((row) => row.platform === platform && statuses.includes(row.status))
        .reduce((total, row) => total + row.count, 0);
    return {
      platform,
      published: count(['PUBLISHED']),
      failed: count(['FAILED']),
      pending: count(['PENDING', 'PUBLISHING']),
    };
  });
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Resumen general de tu plataforma de marketing."
        actions={
          <Button nativeButton={false} render={<Link href="/campaigns/new" />}>
            <Plus className="mr-2 size-4" />
            Nueva campaña
          </Button>
        }
      />
      <DashboardStats
        metrics={{
          campaigns: { value: data.totals.campaigns },
          products: { value: data.totals.products },
          publications: { value: data.totals.published },
          pendingApproval: { value: data.totals.pendingApproval },
        }}
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <CampaignOverview data={data.campaignsByStatus} />
        <PublicationSummary publications={publications} />
      </div>
      <RecentCampaigns campaigns={data.recentCampaigns} />
      <Link
        href="/templates"
        className="flex items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40"
      >
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <LayoutGrid className="size-5" />
        </div>
        <div>
          <p className="font-semibold">Biblioteca de plantillas</p>
          <p className="text-sm text-muted-foreground">
            {data.totals.templates} plantillas para tus próximas campañas
          </p>
        </div>
      </Link>
    </div>
  );
}

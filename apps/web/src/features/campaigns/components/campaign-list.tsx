'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStoredCampaigns } from '../hooks/use-stored-campaigns';
import { campaignStatusLabels } from '../types/stored-campaign.types';
import { CampaignPagination } from './campaign-pagination';
export function CampaignList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useStoredCampaigns(page);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campañas"
        description="Consulta el estado y contenido de tus campañas."
        actions={
          <Button nativeButton={false} render={<Link href="/campaigns/new" />}>
            Nueva campaña
          </Button>
        }
      />
      {isLoading && <p role="status">Cargando campañas…</p>}
      {error && (
        <div role="alert">
          <p>{error.message}</p>
          <Button onClick={() => void refetch()}>Reintentar</Button>
        </div>
      )}
      {!error && data && (
        <>
          <p>{data.meta.total} campañas</p>
          {!data.data.length && <p>No hay campañas en esta página.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {data.data.map((campaign) => (
              <article key={campaign.id} className="space-y-3 rounded-xl border bg-card p-5">
                <Link className="font-semibold underline" href={`/campaigns/${campaign.id}`}>
                  {campaign.title}
                </Link>
                <div>
                  <Badge variant="secondary">{campaignStatusLabels[campaign.status]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{campaign.cta}</p>
              </article>
            ))}
          </div>
        </>
      )}
      <CampaignPagination
        page={page}
        totalPages={data?.meta.totalPages}
        pending={isLoading}
        onChange={setPage}
      />
    </div>
  );
}

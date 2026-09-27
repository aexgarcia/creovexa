'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useStoredCampaigns } from '@/features/campaigns/hooks/use-stored-campaigns';
import { CampaignPagination } from '@/features/campaigns/components/campaign-pagination';
import { CampaignPublications } from '@/features/campaigns/components/campaign-publications';
export function PublicationList() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: string; title: string } | null>(null);
  const { data, isLoading, error, refetch } = useStoredCampaigns(page);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Publicaciones"
        description="Selecciona una campaña para consultar sus destinos e intentos."
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
          {!data.data.length && <p>No hay campañas en esta página.</p>}
          <div className="flex flex-wrap gap-3">
            {data.data.map((campaign) => (
              <Button
                key={campaign.id}
                variant={selected?.id === campaign.id ? 'default' : 'outline'}
                onClick={() => setSelected({ id: campaign.id, title: campaign.title })}
              >
                {campaign.title}
              </Button>
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
      {selected && (
        <>
          <h2 className="text-xl font-semibold">{selected.title}</h2>
          <CampaignPublications key={selected.id} campaignId={selected.id} />
        </>
      )}
    </div>
  );
}

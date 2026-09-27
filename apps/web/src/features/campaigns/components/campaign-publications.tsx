'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { campaignApi } from '../services/campaign-api.service';
import { CampaignPagination } from './campaign-pagination';
const labels = {
  PENDING: 'Pendiente',
  PUBLISHING: 'Publicando',
  PUBLISHED: 'Publicada',
  FAILED: 'Fallida',
};
export function CampaignPublications({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['stored-publications', campaignId, page],
    queryFn: ({ signal }) => campaignApi.publications(campaignId, page, signal),
    retry: false,
  });
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Publicaciones por destino</h2>
      <p className="text-sm text-muted-foreground">
        Estado y último intento disponible de cada destino.
      </p>
      {isLoading && <p role="status">Cargando publicaciones…</p>}
      {error && (
        <div role="alert">
          <p>{error.message}</p>
          <Button onClick={() => void refetch()}>Reintentar</Button>
        </div>
      )}
      {!error && data && (
        <>
          {!data.data.length && <p>No hay publicaciones registradas.</p>}
          {data.data.map((publication) => (
            <article key={publication.id} className="space-y-2 rounded-xl border p-4">
              <h3 className="font-semibold">
                {publication.platform} · {labels[publication.status]}
              </h3>
              <p className="break-all text-sm">Cuenta: {publication.socialAccountId}</p>
              <p>Último intento: {publication.attempt?.number ?? 'Sin intentos'}</p>
              {publication.failureCode && (
                <p className="text-destructive">Error: {publication.failureCode}</p>
              )}
              {publication.externalPostId && (
                <p className="break-all">Publicación externa: {publication.externalPostId}</p>
              )}
              <p>
                Fecha de publicación:{' '}
                {publication.publishedAt
                  ? new Date(publication.publishedAt).toLocaleString('es-PE')
                  : 'Sin publicar'}
              </p>
            </article>
          ))}
        </>
      )}
      <CampaignPagination
        page={page}
        totalPages={data?.meta.totalPages}
        pending={isLoading}
        onChange={setPage}
      />
    </section>
  );
}

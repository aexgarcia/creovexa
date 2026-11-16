'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CollectionPagination } from '@/components/layout/collection-pagination';
import { PublicationPlatform } from '@/features/publications/components/publication-platform';
import { PublicationStatusBadge } from '@/features/publications/components/publication-status-badge';
import { campaignApi } from '../services/campaign-api.service';

export function CampaignPublications({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['stored-publications', campaignId, page],
    queryFn: ({ signal }) => campaignApi.publications(campaignId, page, signal),
    retry: false,
  });
  return (
    <section className="space-y-4" aria-label="Publicaciones por destino">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Send aria-hidden="true" className="size-4 text-brand-cyan" /> Publicaciones por destino
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Estado y último intento registrado de cada destino. El envío a redes estará disponible
          próximamente.
        </p>
      </div>
      {isLoading && (
        <div role="status">
          <span className="sr-only">Cargando publicaciones…</span>
          <Skeleton className="h-28 rounded-xl" />
        </div>
      )}
      {error && (
        <div role="alert" className="space-y-3 rounded-xl border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar consulta
          </Button>
        </div>
      )}
      {!error && data && (
        <>
          {!data.data.length && (
            <div className="rounded-xl border border-dashed bg-control/50 px-4 py-8 text-center">
              <p className="text-sm font-medium">Sin publicaciones registradas</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Aprobar el flyer no lo publica automáticamente.
              </p>
            </div>
          )}
          <ul className="space-y-3">
            {data.data.map((publication) => (
              <li key={publication.id} className="min-w-0 rounded-xl border bg-control/50 p-4">
                <article className="space-y-4" aria-label={`Destino ${publication.platform}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <PublicationPlatform platform={publication.platform} />
                    <PublicationStatusBadge status={publication.status} />
                  </div>
                  <dl className="space-y-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Cuenta</dt>
                      <dd className="mt-1 break-all">{publication.socialAccountId}</dd>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Último intento</dt>
                        <dd className="mt-1">
                          {publication.attempt
                            ? `Intento ${publication.attempt.number}`
                            : 'Sin intentos'}
                        </dd>
                        {publication.attempt && (
                          <dd className="mt-1 text-muted-foreground">
                            {new Date(publication.attempt.startedAt).toLocaleString('es-PE')}
                          </dd>
                        )}
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Fecha de publicación</dt>
                        <dd className="mt-1">
                          {publication.publishedAt
                            ? new Date(publication.publishedAt).toLocaleString('es-PE')
                            : 'Sin fecha registrada'}
                        </dd>
                      </div>
                    </div>
                    {publication.externalPostId && (
                      <div>
                        <dt className="text-muted-foreground">Publicación externa</dt>
                        <dd className="mt-1 break-all">{publication.externalPostId}</dd>
                      </div>
                    )}
                  </dl>
                  {publication.failureCode && (
                    <p className="break-all rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                      Error: {publication.failureCode}
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ul>
          <CollectionPagination
            {...data.meta}
            page={page}
            busy={isFetching}
            onPageChange={setPage}
            label="Páginas de destinos"
          />
        </>
      )}
    </section>
  );
}

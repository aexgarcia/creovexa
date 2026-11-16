'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ChevronDown, History, Info, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { CollectionPagination } from '@/components/layout/collection-pagination';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { publicationService } from '../services/publication.service';
import { PublicationPlatform } from './publication-platform';
import { PublicationStatusBadge } from './publication-status-badge';
import { PublicationAttemptHistory } from './publication-attempt-history';

export function PublicationList() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['publication-history', page],
    queryFn: ({ signal }) => publicationService.findAll(page, signal),
    retry: false,
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Publicaciones"
        description="El historial de tus campañas, destino por destino."
      />
      <div className="flex items-start gap-3 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-4 text-sm leading-relaxed text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-cyan" />
        <p>
          El envío a redes estará disponible próximamente. Aquí puedes consultar los registros y sus
          intentos guardados.
        </p>
      </div>
      {query.isLoading && (
        <div role="status" className="space-y-3 rounded-2xl border bg-card p-5">
          <span className="sr-only">Cargando publicaciones…</span>
          {[1, 2, 3].map((value) => (
            <Skeleton key={value} className="h-24 rounded-xl" />
          ))}
        </div>
      )}
      {query.error && (
        <div role="alert" className="space-y-4 rounded-2xl border bg-card p-6">
          <p className="font-medium">No se pudo cargar el historial</p>
          <p className="text-sm text-muted-foreground">{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Reintentar consulta
          </Button>
        </div>
      )}
      {query.data && !query.error && (
        <section
          aria-label="Historial de publicaciones"
          className="overflow-hidden rounded-2xl border bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <History aria-hidden="true" className="size-4 text-brand-cyan" /> Historial por
              destino
            </h2>
            <span className="text-xs text-muted-foreground">{query.data.meta.total} registros</span>
          </div>
          {!query.data.data.length && (
            <div className="flex flex-col items-center px-5 py-14 text-center">
              <div className="mb-4 rounded-2xl border bg-control p-4">
                <Send aria-hidden="true" className="size-7 text-brand-cyan" />
              </div>
              <h3 className="font-semibold">Todavía no hay publicaciones registradas</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Los resultados por plataforma y sus intentos aparecerán aquí cuando existan
                registros.
              </p>
              <Button
                className="mt-5"
                variant="outline"
                nativeButton={false}
                render={<Link href="/campaigns" />}
              >
                Ver campañas <ArrowUpRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          )}
          <ul className="divide-y">
            {query.data.data.map((row) => (
              <li key={row.id} className="min-w-0">
                <div className="grid min-w-0 gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_140px_120px_150px] lg:items-center lg:gap-5 lg:px-6">
                  <div className="min-w-0 space-y-2">
                    <Link
                      className="inline-flex max-w-full items-start gap-2 rounded-sm text-sm font-semibold hover:text-brand-cyan focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      href={`/campaigns/${encodeURIComponent(row.campaignId)}`}
                    >
                      <span className="min-w-0 break-words">{row.campaignTitle}</span>
                      <ArrowUpRight aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    </Link>
                    <p className="break-all text-xs text-muted-foreground">
                      Cuenta: {row.socialAccountId}
                    </p>
                    {row.failureCode && (
                      <p className="break-all text-xs text-destructive">Error: {row.failureCode}</p>
                    )}
                  </div>
                  <PublicationPlatform platform={row.platform} />
                  <PublicationStatusBadge status={row.status} />
                  <div className="flex flex-col items-start gap-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {row.publishedAt ? (
                        <>
                          Publicada el
                          <br />
                          {new Date(row.publishedAt).toLocaleString('es-PE')}
                        </>
                      ) : (
                        'Sin fecha de publicación'
                      )}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-expanded={selected === row.id}
                      aria-controls={`attempts-${row.id}`}
                      onClick={() => setSelected(selected === row.id ? null : row.id)}
                    >
                      {selected === row.id ? 'Ocultar intentos' : 'Ver intentos'}
                      <ChevronDown
                        aria-hidden="true"
                        className={`size-3.5 ${selected === row.id ? 'rotate-180' : ''}`}
                      />
                    </Button>
                  </div>
                </div>
                {selected === row.id && (
                  <div id={`attempts-${row.id}`} className="border-t bg-control/60 p-5 sm:p-6">
                    <PublicationAttemptHistory key={row.id} id={row.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <CollectionPagination
            {...query.data.meta}
            page={page}
            busy={query.isFetching}
            label="Páginas de publicaciones"
            onPageChange={(next) => {
              setPage(next);
              setSelected(null);
            }}
          />
        </section>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollectionPagination } from '@/components/layout/collection-pagination';
import { publicationService } from '../services/publication.service';
import { PublicationStatusBadge } from './publication-status-badge';

export function PublicationAttemptHistory({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['publication-attempts', id, page],
    queryFn: ({ signal }) => publicationService.attempts(id, page, signal),
    retry: false,
  });
  return (
    <section aria-label="Historial de intentos" className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <History aria-hidden="true" className="size-4 text-brand-cyan" /> Historial de intentos
      </h3>
      {query.isLoading && (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando intentos…
        </p>
      )}
      {query.error && (
        <div role="alert" className="space-y-3 rounded-xl border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{query.error.message}</p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Reintentar consulta
          </Button>
        </div>
      )}
      {!query.error && query.data && (
        <>
          {!query.data.data.length && (
            <p className="text-sm text-muted-foreground">Sin intentos registrados.</p>
          )}
          <ol className="space-y-3">
            {query.data.data.map((attempt) => (
              <li key={attempt.id} className="min-w-0 rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium">Intento {attempt.number}</p>
                  {attempt.result ? (
                    <PublicationStatusBadge status={attempt.result.status} />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      En curso, sin resultado registrado
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Inicio: {new Date(attempt.startedAt).toLocaleString('es-PE')}
                </p>
                {attempt.result && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Resultado registrado:{' '}
                    {new Date(attempt.result.recordedAt).toLocaleString('es-PE')}
                  </p>
                )}
                {attempt.result?.failureCode && (
                  <p className="mt-3 break-all text-xs text-destructive">
                    Error: {attempt.result.failureCode}
                  </p>
                )}
                {attempt.result?.externalPostId && (
                  <p className="mt-3 break-all text-xs text-muted-foreground">
                    ID externo: {attempt.result.externalPostId}
                  </p>
                )}
              </li>
            ))}
          </ol>
          <CollectionPagination
            {...query.data.meta}
            page={page}
            busy={query.isFetching}
            onPageChange={setPage}
            label="Páginas de intentos"
          />
        </>
      )}
    </section>
  );
}

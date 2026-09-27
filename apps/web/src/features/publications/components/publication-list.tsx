'use client';
import { Fragment, useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PublicationPlatform } from './publication-platform';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { CampaignPagination } from '@/features/campaigns/components/campaign-pagination';
import { publicationService } from '../services/publication.service';
const labels: Record<string, string> = {
  PENDING: 'Pendiente',
  PUBLISHING: 'Publicando',
  PUBLISHED: 'Publicada',
  FAILED: 'Fallida',
};
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
        description="Estado por destino e historial de intentos de tu empresa."
      />
      {query.isLoading && <p role="status">Cargando publicaciones…</p>}
      {query.error && (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button onClick={() => void query.refetch()}>Reintentar</Button>
        </div>
      )}
      {query.data && !query.error && (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Publicación</TableHead>
                  <TableHead>
                    <span className="sr-only">Historial</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      Todavía no hay publicaciones registradas.
                    </TableCell>
                  </TableRow>
                )}
                {query.data.data.map((row) => (
                  <Fragment key={row.id}>
                    <TableRow>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={'/campaigns/' + row.campaignId}
                        >
                          {row.campaignTitle}
                        </Link>
                        {row.failureCode && (
                          <p className="mt-1 text-xs text-destructive">Error: {row.failureCode}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.platform === 'FACEBOOK' ||
                        row.platform === 'INSTAGRAM' ||
                        row.platform === 'TIKTOK' ? (
                          <PublicationPlatform platform={row.platform} />
                        ) : (
                          row.platform
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'FAILED' ? 'destructive' : 'secondary'}>
                          {labels[row.status] ?? row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.publishedAt
                          ? new Date(row.publishedAt).toLocaleString('es-PE')
                          : 'Pendiente'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-expanded={selected === row.id}
                          onClick={() => setSelected(selected === row.id ? null : row.id)}
                        >
                          Ver intentos
                        </Button>
                      </TableCell>
                    </TableRow>
                    {selected === row.id && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/20 p-5">
                          <p className="mb-4 break-all text-xs text-muted-foreground">
                            Cuenta: {row.socialAccountId}
                          </p>
                          <AttemptHistory key={row.id} id={row.id} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      <CampaignPagination
        page={page}
        totalPages={query.data?.meta.totalPages}
        pending={query.isLoading}
        onChange={(next) => {
          setPage(next);
          setSelected(null);
        }}
      />
    </div>
  );
}
function AttemptHistory({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['publication-attempts', id, page],
    queryFn: ({ signal }) => publicationService.attempts(id, page, signal),
    retry: false,
  });
  return (
    <section className="space-y-3 border-t pt-3">
      <h3 className="font-semibold">Historial de intentos</h3>
      {query.isLoading && <p role="status">Cargando intentos…</p>}
      {query.error && (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button onClick={() => void query.refetch()}>Reintentar</Button>
        </div>
      )}
      {!query.error && query.data && (
        <>
          {!query.data.data.length && <p>Sin intentos.</p>}
          {query.data.data.map((attempt) => (
            <div key={attempt.id} className="rounded-lg bg-muted p-3">
              <p>
                Intento {attempt.number} · {new Date(attempt.startedAt).toLocaleString('es-PE')}
              </p>
              <p>
                {attempt.result
                  ? labels[attempt.result.status]
                  : 'En curso, sin resultado registrado'}
              </p>
              {attempt.result?.failureCode && <p>Error: {attempt.result.failureCode}</p>}
              {attempt.result?.externalPostId && (
                <p className="break-all">ID externo: {attempt.result.externalPostId}</p>
              )}
            </div>
          ))}
        </>
      )}
      <CampaignPagination
        page={page}
        totalPages={query.data?.meta.totalPages}
        pending={query.isLoading}
        onChange={setPage}
      />
    </section>
  );
}

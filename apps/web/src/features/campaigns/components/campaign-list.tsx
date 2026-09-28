'use client';
import { Plus, Megaphone, ArrowUpRight } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableCell,
  TableRow,
} from '@/components/ui/table';
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
            <Plus className="mr-2 size-4" />
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
          <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Megaphone className="size-6" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{data.meta.total}</p>
              <p className="text-sm text-muted-foreground">Campañas registradas</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data.data.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                      Crea tu primera campaña para comenzar.
                    </TableCell>
                  </TableRow>
                )}
                {data.data.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        href={'/campaigns/' + campaign.id}
                      >
                        {campaign.title}
                      </Link>
                      <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">
                        {campaign.cta}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{campaignStatusLabels[campaign.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(campaign.createdAt).toLocaleDateString('es-PE')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={'/campaigns/' + campaign.id} />}
                        aria-label={'Ver ' + campaign.title}
                      >
                        <ArrowUpRight className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Megaphone, Plus, Search, SearchX, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { CollectionPagination } from '@/components/layout/collection-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useStoredCampaigns } from '../hooks/use-stored-campaigns';
import { campaignStatusLabels, type StoredCampaignStatus } from '../types/stored-campaign.types';
import { CampaignTable } from './campaign-table';

export function CampaignList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StoredCampaignStatus | 'ALL'>('ALL');
  const { data, isPending, isFetching, error, refetch } = useStoredCampaigns(page);
  const term = search.trim().toLocaleLowerCase('es');
  const filtered = Boolean(term) || status !== 'ALL';
  const visible =
    data?.data.filter(
      (campaign) =>
        (status === 'ALL' || campaign.status === status) &&
        (!term ||
          [campaign.title, campaign.occasion, campaign.cta]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('es')
            .includes(term)),
    ) ?? [];
  function clearFilters() {
    setSearch('');
    setStatus('ALL');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campañas"
        description="De una idea a un flyer listo para compartir. Crea, revisa y sigue el estado de tu contenido."
        actions={
          <Button nativeButton={false} render={<Link href="/campaigns/new" />}>
            <Plus className="size-4" /> Nueva campaña
          </Button>
        }
      />
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-[440px]">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
            />
            <Input
              aria-label="Buscar campañas en esta página"
              placeholder="Buscar por nombre, ocasión o llamada a la acción"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 pl-10"
            />
          </div>
          <div className="relative sm:min-w-[240px]">
            <SlidersHorizontal
              aria-hidden="true"
              className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
            />
            <select
              aria-label="Filtrar campañas por estado en esta página"
              value={status}
              onChange={(event) => setStatus(event.target.value as StoredCampaignStatus | 'ALL')}
              className="h-10 w-full rounded-[10px] border border-input bg-control pr-8 pl-10 text-[13px]"
            >
              <option value="ALL">Todos los estados</option>
              {(Object.entries(campaignStatusLabels) as [StoredCampaignStatus, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Búsqueda y filtro en esta página.
          {filtered && data && !error
            ? ` ${visible.length} coincidencias de ${data.data.length} campañas cargadas.`
            : ''}
        </p>
      </div>
      {isPending ? (
        <div
          role="status"
          aria-label="Cargando campañas"
          className="overflow-hidden rounded-2xl border bg-card p-5"
        >
          <Skeleton className="mb-6 h-5 w-44" />
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-center gap-4 border-t py-5">
              <Skeleton className="size-14 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="space-y-3 rounded-2xl border border-destructive/25 bg-card p-6"
        >
          <h2 className="font-semibold">No pudimos cargar tus campañas</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            Reintentar
          </Button>
        </div>
      ) : data && data.meta.total === 0 && page === 1 ? (
        <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10">
            <Megaphone aria-hidden="true" className="size-7 text-brand-cyan" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Tu próxima campaña empieza aquí</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Elige un producto y una plantilla. Después podrás generar el texto y el flyer,
            revisarlos y aprobar tu contenido.
          </p>
          <Button className="mt-6" nativeButton={false} render={<Link href="/campaigns/new" />}>
            Crear mi primera campaña <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : data ? (
        <section
          aria-label="Listado de campañas"
          aria-busy={isFetching}
          className="overflow-hidden rounded-2xl border bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold">Tus campañas</h2>
              <span className="rounded-full border bg-secondary px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
                {data.meta.total}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {isFetching ? 'Actualizando…' : 'De borrador a publicada'}
            </span>
          </div>
          {visible.length ? (
            <CampaignTable campaigns={visible} />
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
              <SearchX aria-hidden="true" className="mb-4 size-8 text-muted-foreground" />
              <h3 className="font-semibold">
                {filtered ? 'Sin coincidencias en esta página' : 'No hay campañas en esta página'}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {filtered
                  ? 'Prueba con otro nombre o estado. También puedes consultar las otras páginas.'
                  : 'Vuelve a la página anterior para consultar tus campañas.'}
              </p>
              {filtered && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                  Limpiar búsqueda y estado
                </Button>
              )}
            </div>
          )}
          <CollectionPagination
            label="Páginas de campañas"
            page={page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            limit={data.meta.limit}
            busy={isFetching}
            onPageChange={setPage}
          />
        </section>
      ) : null}
    </div>
  );
}

'use client';
import { Plus, Search, Info } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { CollectionPagination } from '@/components/layout/collection-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTemplates } from '../hooks/use-templates';
import type { TemplateFormat } from '../types/template-design';
import { FORMAT_LABELS } from '../types/template-design-options';
import { TemplateCard } from './template-card';
import { TemplateEmptyState } from './template-empty-state';

export function TemplateList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [format, setFormat] = useState<TemplateFormat | 'ALL'>('ALL');
  const { data: templates, meta, isPending, isFetching, error, refetch } = useTemplates(page);
  const term = search.trim().toLocaleLowerCase('es');
  const visible =
    templates?.filter(
      (template) =>
        (format === 'ALL' || template.currentRevision.design.format === format) &&
        (!term || template.name.toLocaleLowerCase('es').includes(term)),
    ) ?? [];
  const filtered = Boolean(term) || format !== 'ALL';
  return (
    <div className="space-y-6">
      <PageHeader
        title="Plantillas"
        description="La dirección de arte de tus flyers. Cada plantilla guarda formato, estilo y qué elementos mostrar."
        actions={
          <Button nativeButton={false} render={<Link href="/templates/new" />}>
            <Plus className="size-4" />
            Nueva plantilla
          </Button>
        }
      />
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1 lg:max-w-[380px]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
          />
          <Input
            aria-label="Buscar plantillas en esta página"
            placeholder="Buscar plantilla"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 pl-10"
          />
        </div>
        <div
          role="group"
          aria-label="Filtrar plantillas por formato"
          className="flex max-w-full flex-wrap gap-0.5 rounded-[11px] border border-input bg-control p-[3px]"
        >
          {(
            [
              { value: 'ALL', label: 'Todas' },
              ...Object.entries(FORMAT_LABELS).map(([value, label]) => ({
                value: value as TemplateFormat,
                label,
              })),
            ] as const
          ).map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={format === option.value}
              onClick={() => setFormat(option.value)}
              className={`h-8 rounded-lg border px-3 text-[13px] font-medium transition-colors ${format === option.value ? 'border-input bg-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground" aria-live="polite">
        Búsqueda y filtros en esta página.
        {filtered && !isPending && !error ? ` ${visible.length} coincidencias.` : ''}
      </p>
      <div className="flex items-start gap-3 rounded-xl border bg-card p-4 text-[13px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-[#7fa0ff]" />
        <p>
          Las miniaturas son un <b className="font-medium text-foreground">esquema orientativo</b>{' '}
          con colores y textos de ejemplo. La IA diseña cada flyer con tus indicaciones, la foto del
          producto y los colores de tu marca.
        </p>
      </div>
      {isPending ? (
        <div
          role="status"
          aria-label="Cargando plantillas"
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-96 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-2xl border bg-card p-6">
          <p>{error.message}</p>
          <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : !templates?.length && page === 1 && !meta?.total ? (
        <TemplateEmptyState />
      ) : (
        <>
          <div aria-busy={isFetching}>
            {visible.length ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border bg-card p-12 text-center">
                <h2 className="font-medium">
                  {filtered
                    ? 'Sin coincidencias en esta página'
                    : 'No hay plantillas en esta página'}
                </h2>
                {filtered && (
                  <Button
                    variant="ghost"
                    className="mt-3"
                    onClick={() => {
                      setSearch('');
                      setFormat('ALL');
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            )}
          </div>
          {meta && (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <CollectionPagination
                label="Páginas de plantillas"
                page={page}
                totalPages={meta.totalPages}
                total={meta.total}
                limit={meta.limit}
                busy={isFetching}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

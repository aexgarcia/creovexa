'use client';
import { LayoutGrid, Plus } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTemplates } from '../hooks/use-templates';
import { TemplateCard } from './template-card';
import { TemplateEmptyState } from './template-empty-state';

export function TemplateList() {
  const [page, setPage] = useState(1);
  const { data: templates, meta, isLoading, error, refetch } = useTemplates(page);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Plantillas"
        description="Administra las plantillas y consulta sus revisiones."
        actions={
          <Button nativeButton={false} render={<Link href="/templates/new" />}>
            <Plus className="mr-2 size-4" /> Nueva plantilla
          </Button>
        }
      />
      {meta && (
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <LayoutGrid className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{meta?.total ?? 0}</p>
            <p className="text-sm text-muted-foreground">plantillas</p>
          </div>
        </div>
      )}
      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && (
        <div role="alert" className="space-y-3">
          <p>{error.message}</p>
          <Button onClick={() => void refetch()}>Reintentar</Button>
        </div>
      )}
      {!isLoading && !error && templates?.length === 0 && <TemplateEmptyState />}
      {!isLoading && !error && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {templates?.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={page === 1 || isLoading}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </Button>
        <span>
          Página {page}
          {meta ? ` de ${Math.max(1, meta.totalPages)}` : ''}
        </span>
        <Button
          variant="outline"
          disabled={!meta || page >= meta.totalPages || isLoading}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

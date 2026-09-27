'use client';
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
            Nueva plantilla
          </Button>
        }
      />
      {meta && <p className="text-sm text-muted-foreground">{meta.total} plantillas</p>}
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

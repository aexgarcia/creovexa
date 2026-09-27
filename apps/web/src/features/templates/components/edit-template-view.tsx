'use client';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTemplate } from '../hooks/use-template';

export function EditTemplateView({ templateId }: { templateId: string }) {
  const { data: template, isLoading, error, refetch } = useTemplate(templateId);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !template)
    return (
      <div role="alert" className="space-y-4">
        <p>{error?.message ?? 'Plantilla no encontrada.'}</p>
        <Button onClick={() => void refetch()}>Reintentar</Button>
      </div>
    );
  const revision = template.currentRevision;
  return (
    <div className="space-y-6">
      <PageHeader title={template.name} description="Información guardada de la plantilla." />
      <dl className="grid gap-4 rounded-xl border bg-card p-6">
        <div>
          <dt className="text-muted-foreground">Revisión actual</dt>
          <dd>{revision.number}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Dimensiones</dt>
          <dd>
            {revision.dimensions.width} × {revision.dimensions.height} px
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Identificador de revisión</dt>
          <dd className="break-all">{revision.id}</dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        La edición y personalización visual estarán disponibles próximamente.
      </p>
      <Button variant="outline" nativeButton={false} render={<Link href="/templates" />}>
        Volver a plantillas
      </Button>
    </div>
  );
}

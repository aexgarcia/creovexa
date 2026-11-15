'use client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTemplate } from '../hooks/use-template';
import { templateService } from '../services/template.service';
import type { StoredTemplate } from '../types/stored-template.types';
import type { TemplateDesign } from '../types/template-design';
import { TemplateForm } from './template-form';

export function EditTemplateView({ templateId }: { templateId: string }) {
  const query = useTemplate(templateId);
  if (query.isPending)
    return (
      <div role="status" aria-label="Cargando plantilla">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="mt-6 h-[500px] w-full rounded-2xl" />
      </div>
    );
  if (query.error || !query.data)
    return (
      <div role="alert" className="space-y-3 rounded-2xl border bg-card p-6">
        <p>{query.error?.message ?? 'Plantilla no encontrada.'}</p>
        <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  return <TemplateProfile key={query.data.currentRevision.id} template={query.data} />;
}

function TemplateProfile({ template }: { template: StoredTemplate }) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { name: string; design: TemplateDesign }) =>
      templateService.update(template.id, {
        ...input,
        expectedRevisionId: template.currentRevision.id,
      }),
    retry: false,
    onSuccess: async (updated) => {
      client.setQueryData(['templates', updated.id], updated);
      await client.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Revisión guardada correctamente.');
    },
  });
  async function submit(input: { name: string; design: TemplateDesign }) {
    try {
      await mutation.mutateAsync(input);
    } catch {
      /* El error se muestra en el formulario. */
    }
  }
  return (
    <>
      {template.archivedAt && (
        <p role="note" className="mb-6 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Plantilla archivada. Guardar cambios no la restaura. Puedes restaurarla desde el filtro
          Archivados del catálogo para usarla en nuevas generaciones.
        </p>
      )}
      <TemplateForm
        template={template}
        pending={mutation.isPending}
        onSubmit={submit}
        error={
          mutation.error ? (
            <div
              role="alert"
              className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
            >
              <p>{mutation.error.message}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  void client.invalidateQueries({ queryKey: ['templates', template.id] })
                }
              >
                Recargar revisión
              </Button>
            </div>
          ) : undefined
        }
      />
    </>
  );
}

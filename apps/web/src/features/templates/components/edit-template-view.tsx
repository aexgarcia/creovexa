'use client';
import { TemplateVisualSettings } from './template-visual-settings';
import { TemplateDesignPreview } from './template-design-preview';
import { toast } from 'sonner';
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTemplate } from '../hooks/use-template';
import { templateService } from '../services/template.service';
import type { StoredTemplate } from '../types/stored-template.types';
export function EditTemplateView({ templateId }: { templateId: string }) {
  const query = useTemplate(templateId);
  if (query.isLoading) return <p role="status">Cargando plantilla…</p>;
  if (query.error || !query.data)
    return (
      <div role="alert">
        <p>{query.error?.message ?? 'Plantilla no encontrada.'}</p>
        <Button onClick={() => void query.refetch()}>Reintentar</Button>
      </div>
    );
  return <TemplateProfile key={query.data.currentRevision.id} template={query.data} />;
}
function TemplateProfile({ template }: { template: StoredTemplate }) {
  const client = useQueryClient();
  const [name, setName] = useState(template.name);
  const [invalid, setInvalid] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      templateService.update(template.id, {
        name: name.trim(),
        expectedRevisionId: template.currentRevision.id,
      }),
    retry: false,
    onSuccess: async () => {
      toast.success('Revisión guardada correctamente.');
      await client.invalidateQueries({ queryKey: ['templates'] });
    },
  });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvalid(!name.trim());
    if (!name.trim() || mutation.isPending) return;
    try {
      await mutation.mutateAsync();
    } catch {
      /* Safe error displayed below. */
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar plantilla"
        description={`Revisión ${template.currentRevision.number}`}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="space-y-5 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Información de la plantilla</h2>
          <Label htmlFor="template-name">Nombre</Label>
          <Input
            id="template-name"
            value={name}
            required
            maxLength={200}
            disabled={mutation.isPending}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="text-sm">
            Guardar crea una nueva revisión. Las campañas existentes conservan su revisión anterior.
          </p>
          <TemplateVisualSettings />
          {invalid && <p role="alert">Introduce un nombre.</p>}
          {mutation.error && (
            <div role="alert">
              <p>{mutation.error.message}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void client.invalidateQueries({ queryKey: ['templates', template.id] })
                }
              >
                Recargar revisión
              </Button>
            </div>
          )}
          <Button type="submit" disabled={mutation.isPending || name.trim() === template.name}>
            {mutation.isPending ? 'Guardando…' : 'Guardar revisión'}
          </Button>
        </form>
        <aside className="space-y-5 rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Vista previa</h2>
          <TemplateDesignPreview
            width={template.currentRevision.dimensions.width}
            height={template.currentRevision.dimensions.height}
          />
        </aside>
      </div>
      <Button variant="outline" nativeButton={false} render={<Link href="/templates" />}>
        Volver a plantillas
      </Button>
    </div>
  );
}

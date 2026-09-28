'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TemplateVisualSettings } from './template-visual-settings';
import { TemplateDesignPreview } from './template-design-preview';
import { useCreateTemplate } from '../hooks/use-create-template';

export function CreateTemplateView() {
  const router = useRouter();
  const createTemplate = useCreateTemplate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || name.trim().length > 200) {
      setError('Introduce un nombre de entre 1 y 200 caracteres.');
      return;
    }
    setError('');
    try {
      await createTemplate.mutateAsync({
        name: name.trim(),
        dimensions: { width: 1080, height: 1080 },
      });
      toast.success('Plantilla creada correctamente');
      router.push('/templates');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la plantilla.');
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva plantilla"
        description="Crea una plantilla cuadrada con su primera revisión."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-card p-6">
          <div>
            <h2 className="text-lg font-semibold">Información de la plantilla</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Define el nombre y formato de tu próxima pieza.
            </p>
          </div>
          <fieldset disabled={createTemplate.isPending} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nombre</Label>
              <Input
                id="template-name"
                required
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <p>Formato cuadrado · 1080 × 1080 px</p>
            <p className="text-sm text-muted-foreground">
              La personalización visual estará disponible próximamente.
            </p>
            <TemplateVisualSettings />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <Button type="submit">
                {createTemplate.isPending ? 'Guardando…' : 'Crear plantilla'}
              </Button>
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={<Link href="/templates" />}
              >
                Cancelar
              </Button>
            </div>
          </fieldset>
        </form>
        <aside className="space-y-5 rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Vista previa</h2>
          <TemplateDesignPreview />
        </aside>
      </div>
    </div>
  );
}

'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-xl border bg-card p-6">
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
            La personalización visual y la edición estarán disponibles próximamente.
          </p>
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
    </div>
  );
}

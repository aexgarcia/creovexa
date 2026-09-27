'use client';
import { useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCompanySettings } from '../hooks/use-company-settings';
import { useUpdateCompanySettings } from '../hooks/use-update-company-settings';
import type { OrganizationSettings } from '../services/company-settings.service';

export function CompanySettingsView() {
  const query = useCompanySettings();
  if (query.isLoading) return <p role="status">Cargando configuración…</p>;
  if (query.error || !query.data)
    return (
      <div role="alert">
        <p>{query.error?.message ?? 'No se encontró la organización.'}</p>
        <Button onClick={() => void query.refetch()}>Reintentar</Button>
      </div>
    );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de empresa"
        description="Información utilizada para preparar tus campañas."
      />
      <OrganizationForm key={query.data.id} settings={query.data} />
    </div>
  );
}
function OrganizationForm({ settings }: { settings: OrganizationSettings }) {
  const [name, setName] = useState(settings.name);
  const [description, setDescription] = useState(settings.description);
  const [tone, setTone] = useState(settings.brandTone ?? '');
  const [message, setMessage] = useState('');
  const update = useUpdateCompanySettings();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (update.isPending) return;
    setMessage('');
    update.reset();
    if (!name.trim()) {
      setMessage('Introduce el nombre de la empresa.');
      return;
    }
    try {
      const saved = await update.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        brandTone: tone.trim() || null,
      });
      setName(saved.name);
      setDescription(saved.description);
      setTone(saved.brandTone ?? '');
      setMessage('Configuración guardada correctamente.');
    } catch {
      /* The mutation displays its safe error below. */
    }
  }
  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-xl border bg-card p-6">
      <fieldset disabled={update.isPending} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="organization-name">Nombre de empresa</Label>
          <Input
            id="organization-name"
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organization-description">Descripción</Label>
          <Textarea
            id="organization-description"
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organization-tone">Tono de marca (opcional)</Label>
          <Input
            id="organization-tone"
            maxLength={200}
            placeholder="Ej. cercano y profesional"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          La edición del logo, el color y el CTA predeterminado estará disponible próximamente.
        </p>
        {update.error && (
          <p role="alert" className="text-destructive">
            {update.error.message}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <Button type="submit">{update.isPending ? 'Guardando…' : 'Guardar cambios'}</Button>
      </fieldset>
    </form>
  );
}

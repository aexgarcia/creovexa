'use client';
import { Building2, Save, ImageIcon } from 'lucide-react';
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
    <form onSubmit={submit} className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
      <fieldset disabled={update.isPending} className="space-y-6 rounded-xl border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Información de empresa</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dale a tus campañas la voz de tu marca.
          </p>
        </div>
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
            rows={5}
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
        <fieldset disabled className="space-y-4 border-t pt-5">
          <legend className="text-sm text-muted-foreground">Identidad visual · Próximamente</legend>
          <div className="space-y-2">
            <Label htmlFor="brand-logo">Logo</Label>
            <Input id="brand-logo" placeholder="Carga de archivo próximamente" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-color">Color principal</Label>
            <Input id="brand-color" placeholder="Personalización próximamente" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-cta">CTA predeterminado</Label>
            <Input id="brand-cta" placeholder="Próximamente" />
          </div>
        </fieldset>
        <Button type="submit">
          <Save className="mr-2 size-4" />
          {update.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </fieldset>
      <aside className="space-y-5 rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Vista previa de marca</h2>
        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
          <Building2 className="size-12 text-primary" />
          <p className="mt-4 break-words text-xl font-semibold">{name || 'Tu empresa'}</p>
          <p className="mt-2 text-sm text-muted-foreground">{tone || 'Define tu tono de marca'}</p>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {description}
        </p>
        <div className="flex items-center gap-3 border-t pt-4 text-sm text-muted-foreground">
          <ImageIcon className="size-5 shrink-0" />
          {settings.logoAssetId
            ? 'Logo registrado; vista previa pendiente.'
            : 'Sin logo configurado'}
        </div>
      </aside>
    </form>
  );
}

'use client';
import { Building2, Save, ImageIcon } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { ApiError } from '@/lib/api-client';
import { PageHeader } from '@/components/layout/page-header';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCompanySettings } from '../hooks/use-company-settings';
import { useUpdateCompanySettings } from '../hooks/use-update-company-settings';
import { useUploadOrganizationLogo } from '../hooks/use-upload-organization-logo';
import type {
  BrandColors,
  OrganizationSettings,
  Region,
} from '../services/company-settings.service';
import { BrandColorFields, RegionFields } from './brand-kit-fields';
import { LogoVariantField } from './logo-variant-field';
import { BrandVoiceFields, splitWords, type BrandVoiceDraft } from './brand-voice-fields';

const EMPTY_CONTACT = { whatsapp: null, website: null, instagram: null, address: null };
function voiceDraft(settings: OrganizationSettings): BrandVoiceDraft {
  return {
    typography: settings.typography ?? '',
    visualStyle: settings.visualStyle.join(', '),
    contact: settings.contact ?? EMPTY_CONTACT,
    defaultLegalText: settings.defaultLegalText ?? '',
    forbiddenWords: settings.forbiddenWords.join(', '),
  };
}

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
  const [industry, setIndustry] = useState(settings.industry ?? '');
  const [voice, setVoice] = useState(() => voiceDraft(settings));
  const [region, setRegion] = useState<Region>(settings.region);
  const [colors, setColors] = useState<BrandColors | null>(settings.brandColors);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState('');
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );
  const update = useUpdateCompanySettings();
  const upload = useUploadOrganizationLogo();
  const logoUrl = logoFile ? preview : settings.logoUrl;
  const flyerColors = colors ?? settings.logoTraits?.suggestedColors ?? null;
  function chooseLogo(file: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setError('');
    setMessage('');
    setLogoFile(null);
    setPreview(null);
    setFileError('');
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size === 0) {
      setFileError('Selecciona un logo PNG, JPEG o WebP válido.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('El logo supera el máximo de 10 MB.');
      return;
    }
    setLogoFile(file);
    previewUrl.current = URL.createObjectURL(file);
    setPreview(previewUrl.current);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || fileError) return;
    setMessage('');
    setError('');
    update.reset();
    upload.reset();
    if (!name.trim()) {
      setMessage('Introduce el nombre de la empresa.');
      return;
    }
    busy.current = true;
    setSaving(true);
    let profileSaved = false;
    try {
      const saved = await update.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        brandTone: tone.trim() || null,
        industry: industry.trim() || null,
        typography: voice.typography || null,
        visualStyle: splitWords(voice.visualStyle),
        contact: voice.contact,
        defaultLegalText: voice.defaultLegalText.trim() || null,
        forbiddenWords: splitWords(voice.forbiddenWords),
        region,
        brandColors: colors,
      });
      setName(saved.name);
      setDescription(saved.description);
      setTone(saved.brandTone ?? '');
      setIndustry(saved.industry ?? '');
      setVoice(voiceDraft(saved));
      setRegion(saved.region);
      setColors(saved.brandColors);
      profileSaved = true;
      if (logoFile) {
        await upload.mutateAsync(logoFile);
        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        previewUrl.current = null;
        setLogoFile(null);
        setPreview(null);
        if (fileInput.current) fileInput.current.value = '';
      }
      setMessage('Configuración guardada correctamente.');
    } catch (cause) {
      const detail =
        cause instanceof ApiError ? cause.message : 'No se pudo guardar. Inténtalo de nuevo.';
      setError(
        profileSaved
          ? `Los datos se guardaron; el logo no se pudo reemplazar. Puedes reintentar. ${detail}`
          : detail,
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
      <fieldset disabled={saving} className="space-y-6 rounded-xl border bg-card p-6">
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
          <Label htmlFor="organization-industry">Rubro (opcional)</Label>
          <Input
            id="organization-industry"
            maxLength={80}
            placeholder="Ej. cafetería, tienda de tecnología, clínica dental"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Orienta el estilo visual de tus flyers.</p>
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
        <div className="space-y-4 border-t pt-5">
          <h3 className="text-sm font-medium">Voz y estilo de la marca</h3>
          <BrandVoiceFields draft={voice} onChange={setVoice} />
        </div>
        <div className="space-y-4 border-t pt-5">
          <h3 className="text-sm font-medium">Región</h3>
          <RegionFields region={region} onChange={setRegion} />
        </div>
        <div className="space-y-2 border-t pt-5">
          <Label htmlFor="brand-logo">Logo de empresa</Label>
          <Input
            ref={fileInput}
            id="brand-logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => chooseLogo(event.target.files?.[0] ?? null)}
            aria-describedby="logo-help"
          />
          <p id="logo-help" className="text-sm text-muted-foreground">
            PNG, JPEG o WebP · Máximo 10 MB. Un PNG transparente suele quedar mejor en el flyer. Se
            usará en las nuevas campañas.
          </p>
          {logoFile && <p className="break-all text-sm">Logo pendiente: {logoFile.name}</p>}
          {(logoFile || fileError) && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                chooseLogo(null);
                if (fileInput.current) fileInput.current.value = '';
              }}
            >
              Descartar selección
            </Button>
          )}
          {fileError && (
            <p role="alert" className="text-sm text-destructive">
              {fileError}
            </p>
          )}
        </div>
        <div className="space-y-4 border-t pt-5">
          <LogoVariantField variant="dark-background" settings={settings} />
          <LogoVariantField variant="icon" settings={settings} />
        </div>
        <div className="border-t pt-5">
          <BrandColorFields
            custom={colors}
            suggested={settings.logoTraits?.suggestedColors ?? null}
            onChange={setColors}
          />
        </div>
        <fieldset disabled className="space-y-4 border-t pt-5">
          <legend className="text-sm text-muted-foreground">Próximamente</legend>
          <div className="space-y-2">
            <Label htmlFor="brand-cta">CTA predeterminado</Label>
            <Input id="brand-cta" placeholder="Próximamente" />
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <Button type="submit" disabled={saving || Boolean(fileError)}>
          <Save className="mr-2 size-4" />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </fieldset>
      <aside className="space-y-5 rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Vista previa de marca</h2>
        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
          {logoUrl && failedLogo !== logoUrl ? (
            <Image
              src={logoUrl}
              alt={`Logo de ${name || 'tu empresa'}`}
              width={128}
              height={128}
              unoptimized
              className="h-24 w-32 object-contain"
              onError={() => setFailedLogo(logoUrl)}
            />
          ) : (
            <Building2 className="size-12 text-primary" />
          )}
          <p className="mt-4 break-words text-xl font-semibold">{name || 'Tu empresa'}</p>
          <p className="mt-2 text-sm text-muted-foreground">{tone || 'Define tu tono de marca'}</p>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {description}
        </p>
        {flyerColors && (
          <div
            className="flex h-8 overflow-hidden rounded-md border"
            aria-label="Colores de marca que usará el flyer"
          >
            {Object.values(flyerColors).map((color, i) => (
              <span key={i} className="flex-1" style={{ backgroundColor: color }} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 border-t pt-4 text-sm text-muted-foreground">
          <ImageIcon className="size-5 shrink-0" />
          {logoUrl && failedLogo === logoUrl
            ? 'No se pudo cargar la vista previa del logo.'
            : logoFile
              ? 'Vista previa del logo seleccionado'
              : settings.logoAssetId
                ? 'Logo de empresa guardado'
                : 'Sin logo configurado'}
        </div>
      </aside>
    </form>
  );
}

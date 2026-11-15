'use client';
import {
  Building2,
  Save,
  ImageIcon,
  AlignLeft,
  Palette,
  MessageCircle,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type CSSProperties,
} from 'react';
import Image from 'next/image';
import { ApiError } from '@/lib/api-client';
import { PageHeader } from '@/components/layout/page-header';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  BrandTypographyFields,
  BrandContactFields,
  BrandTextRulesFields,
  splitWords,
  type BrandVoiceDraft,
} from './brand-voice-fields';
import { BrandSummary } from './brand-summary';
import { FormSection } from '@/components/layout/form-section';

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
  if (query.isPending)
    return (
      <div role="status" aria-label="Cargando configuración" className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    );
  if (query.error || !query.data)
    return (
      <div role="alert" className="space-y-3 rounded-2xl border bg-card p-6">
        <p>{query.error?.message ?? 'No se encontró la organización.'}</p>
        <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  return <OrganizationForm key={query.data.id} settings={query.data} />;
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
    if (busy.current || variantPending || fileError) return;
    setMessage('');
    setError('');
    update.reset();
    upload.reset();
    if (!name.trim()) {
      setError('Introduce el nombre de la empresa.');
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
  const [variantPending, setVariantPending] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const [navigationHeight, setNavigationHeight] = useState(0);
  useLayoutEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    const measure = () => setNavigationHeight(Math.ceil(navigation.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, []);
  const blocked = saving || variantPending;
  const dirty =
    Boolean(logoFile) ||
    name !== settings.name ||
    description !== settings.description ||
    tone !== (settings.brandTone ?? '') ||
    industry !== (settings.industry ?? '') ||
    JSON.stringify(region) !== JSON.stringify(settings.region) ||
    JSON.stringify(colors) !== JSON.stringify(settings.brandColors) ||
    JSON.stringify(voice) !== JSON.stringify(voiceDraft(settings));
  const saveAction = (
    <Button type="submit" disabled={blocked || Boolean(fileError)}>
      <Save className="size-4" />
      {saving ? 'Guardando…' : 'Guardar cambios'}
    </Button>
  );
  const sections = [
    { id: 'company', label: 'Empresa', icon: Building2 },
    { id: 'voice', label: 'Voz y estilo', icon: AlignLeft },
    { id: 'logos', label: 'Logos', icon: ImageIcon },
    { id: 'colors', label: 'Colores', icon: Palette },
    { id: 'contact', label: 'Contacto', icon: MessageCircle },
    { id: 'rules', label: 'Reglas del texto', icon: ShieldCheck },
    { id: 'region', label: 'Región', icon: Globe },
  ];
  return (
    <form
      onSubmit={submit}
      onChange={() => {
        setMessage('');
        setError('');
      }}
      className="space-y-6"
      style={
        {
          '--settings-sticky-offset': `calc(4rem + ${navigationHeight}px + 1.5rem)`,
        } as CSSProperties
      }
    >
      <PageHeader
        title="Configuración de empresa"
        description="Tu kit de marca. La IA lo usa en cada flyer y en cada texto que escribe por ti."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {dirty && <span className="text-xs text-amber-400">Cambios sin guardar</span>}
            {saveAction}
          </div>
        }
      />
      <nav
        ref={navigationRef}
        aria-label="Secciones de configuración"
        className="sticky top-16 z-10 flex flex-wrap gap-1 border-b bg-background/95 py-3 backdrop-blur"
      >
        {sections.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={'#settings-' + id}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Icon className="size-3.5" />
            {label}
          </a>
        ))}
      </nav>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <fieldset disabled={blocked} className="min-w-0 space-y-5">
          <legend className="sr-only">Kit de marca de la empresa</legend>
          <div id="settings-company" className="scroll-mt-[var(--settings-sticky-offset)]">
            <FormSection
              title="Empresa"
              description="Quién eres y a qué te dedicas."
              icon={Building2}
            >
              <div className="space-y-2">
                <Label htmlFor="organization-name">
                  Nombre de empresa <span className="text-brand-cyan">*</span>
                </Label>
                <Input
                  id="organization-name"
                  required
                  maxLength={200}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization-description">Descripción</Label>
                <Textarea
                  id="organization-description"
                  rows={3}
                  maxLength={5000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Qué vendes, a quién y qué te diferencia."
                  className="rounded-[10px] bg-control px-3.5 py-3 text-sm md:text-sm dark:bg-control"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="organization-industry">
                    Rubro{' '}
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      Opcional
                    </span>
                  </Label>
                  <Input
                    id="organization-industry"
                    maxLength={80}
                    placeholder="Ej. cafetería, tienda de tecnología"
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Orienta el estilo visual de tus flyers.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization-tone">
                    Tono de marca{' '}
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      Opcional
                    </span>
                  </Label>
                  <Input
                    id="organization-tone"
                    maxLength={200}
                    placeholder="Ej. cercano y profesional"
                    value={tone}
                    onChange={(event) => setTone(event.target.value)}
                  />
                </div>
              </div>
            </FormSection>
          </div>
          <div id="settings-voice" className="scroll-mt-[var(--settings-sticky-offset)]">
            <FormSection
              title="Voz y estilo"
              description="Cómo se ve y se siente tu marca."
              icon={AlignLeft}
            >
              <BrandTypographyFields draft={voice} onChange={setVoice} />
            </FormSection>
          </div>
          <div id="settings-logos" className="scroll-mt-[var(--settings-sticky-offset)]">
            <FormSection
              title="Logos"
              description="Tu logo original se conserva en las nuevas campañas."
              icon={ImageIcon}
            >
              <div className="space-y-4 rounded-xl border bg-control p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="grid h-20 w-32 shrink-0 place-items-center rounded-xl border bg-[#f3eff7] p-3">
                    {logoUrl && failedLogo !== logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt="Logo principal"
                        width={128}
                        height={80}
                        unoptimized
                        className="h-full w-full object-contain"
                        onError={() => setFailedLogo(logoUrl)}
                      />
                    ) : (
                      <Building2 className="size-8 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-semibold">Logo principal</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {logoFile
                        ? 'Seleccionado · sin guardar'
                        : settings.logoAssetId
                          ? 'Guardado'
                          : 'Sin subir'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PNG transparente recomendado. Máximo 10 MB.
                    </p>
                  </div>
                </div>
                <Label htmlFor="brand-logo">
                  {settings.logoAssetId ? 'Reemplazar logo principal' : 'Subir logo principal'}
                </Label>
                <Input
                  ref={fileInput}
                  id="brand-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) chooseLogo(file);
                  }}
                  aria-describedby="logo-help"
                  className="min-w-0"
                />
                <p id="logo-help" className="text-xs text-muted-foreground">
                  Se guarda al confirmar los cambios, después del perfil de empresa.
                </p>
                {logoFile && (
                  <p className="break-all text-xs text-muted-foreground">
                    Pendiente: {logoFile.name}
                  </p>
                )}
                {(logoFile || fileError) && (
                  <Button
                    type="button"
                    size="sm"
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
                  <p role="alert" className="text-xs text-destructive">
                    {fileError}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Las variantes se guardan al subirlas o quitarlas. Guarda primero los cambios del
                perfil.
              </p>
              <LogoVariantField
                variant="dark-background"
                settings={settings}
                disabled={dirty || blocked}
                onPendingChange={setVariantPending}
              />
              <LogoVariantField
                variant="icon"
                settings={settings}
                disabled={dirty || blocked}
                onPendingChange={setVariantPending}
              />
            </FormSection>
          </div>
          <div id="settings-colors" className="scroll-mt-[var(--settings-sticky-offset)]">
            <FormSection
              title="Colores de marca"
              description="La paleta de tus flyers, propuesta desde el logo o personalizada."
              icon={Palette}
            >
              <BrandColorFields
                custom={colors}
                suggested={settings.logoTraits?.suggestedColors ?? null}
                onChange={setColors}
              />
            </FormSection>
          </div>
          <div id="settings-contact" className="scroll-mt-[var(--settings-sticky-offset)]">
            <FormSection
              title="Contacto"
              description="Solo aparece en los flyers cuya plantilla lo pide."
              icon={MessageCircle}
            >
              <BrandContactFields draft={voice} onChange={setVoice} />
            </FormSection>
          </div>
          <div id="settings-rules" className="scroll-mt-[var(--settings-sticky-offset)]">
            <FormSection
              title="Reglas del texto"
              description="Lo que siempre debe respetar tu comunicación."
              icon={ShieldCheck}
            >
              <BrandTextRulesFields draft={voice} onChange={setVoice} />
            </FormSection>
          </div>
          <div id="settings-region" className="scroll-mt-[var(--settings-sticky-offset)]">
            <FormSection
              title="Región"
              description="Formato de precios, idioma y hora de tus promociones."
              icon={Globe}
            >
              <RegionFields region={region} onChange={setRegion} />
            </FormSection>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-sm"
            >
              {message}
            </p>
          )}
        </fieldset>
        <BrandSummary
          name={name}
          industry={industry}
          tone={tone}
          logoUrl={logoUrl ?? null}
          colors={flyerColors}
          voice={voice}
          hasLogo={Boolean(logoFile || settings.logoAssetId)}
          pendingLogo={Boolean(logoFile)}
        />
      </div>
      <div className="sticky bottom-0 z-10 flex justify-end border-t bg-background/95 py-4 backdrop-blur xl:static xl:border-0">
        {saveAction}
      </div>
    </form>
  );
}

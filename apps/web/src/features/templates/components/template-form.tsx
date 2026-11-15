'use client';

import Link from 'next/link';
import { useState, type ReactNode, type FormEvent } from 'react';
import { ArrowLeft, Check, Tag, Info } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { defaultTemplateDesign, FORMAT_SIZES, type TemplateDesign } from '../types/template-design';
import { COMPOSITION_LABELS, STYLE_LABELS } from '../types/template-design-options';
import type { StoredTemplate } from '../types/stored-template.types';
import { TemplateVisualSettings } from './template-visual-settings';
import { TemplateDesignPreview } from './template-design-preview';
import { BaseTemplatePicker } from './base-template-picker';
import { StyleReferencesField } from './style-references-field';

export function TemplateForm({
  template,
  pending,
  error,
  onSubmit,
}: {
  template?: StoredTemplate;
  pending: boolean;
  error?: ReactNode;
  onSubmit: (input: { name: string; design: TemplateDesign }) => Promise<void>;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [design, setDesign] = useState(template?.currentRevision.design ?? defaultTemplateDesign);
  const [selectedBase, setSelectedBase] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [referencesPending, setReferencesPending] = useState(false);
  const blocked = pending || referencesPending;
  const dirty =
    !template ||
    name.trim() !== template.name ||
    JSON.stringify(design) !== JSON.stringify(template.currentRevision.design);
  const size = FORMAT_SIZES[design.format];
  const submitLabel = pending ? 'Guardando…' : template ? 'Guardar revisión' : 'Crear plantilla';
  const actions = (
    <>
      <Button
        type="button"
        variant="ghost"
        nativeButton={false}
        render={<Link href="/templates" />}
        disabled={blocked}
      >
        Cancelar
      </Button>
      <Button type="submit" disabled={blocked || !dirty}>
        <Check className="size-4" />
        {submitLabel}
      </Button>
    </>
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || !dirty) return;
    if (!name.trim() || name.trim().length > 200) {
      setInvalid(true);
      document.getElementById('template-name')?.focus();
      return;
    }
    setInvalid(false);
    await onSubmit({ name: name.trim(), design });
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      <Link
        href="/templates"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Plantillas
      </Link>
      <PageHeader
        title={template ? 'Editar plantilla' : 'Nueva plantilla'}
        description={
          template
            ? `Revisión ${template.currentRevision.number}. Guardar crea una nueva revisión; las campañas conservan la que eligieron.`
            : 'Empieza desde una base y ajústala. La vista previa se actualiza mientras editas.'
        }
        actions={<div className="flex flex-wrap gap-3">{actions}</div>}
      />
      {!template && (
        <BaseTemplatePicker
          disabled={blocked}
          selectedKey={selectedBase}
          onChoose={(base) => {
            setDesign(structuredClone(base.design));
            setSelectedBase(base.key);
            if (!name.trim()) setName(base.name);
          }}
        />
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <fieldset disabled={blocked} className="min-w-0 space-y-5">
          <legend className="sr-only">Datos de la plantilla</legend>
          <FormSection
            title="Información"
            description="Un nombre que reconozcas al elegirla en una campaña."
            icon={Tag}
          >
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Nombre <span className="text-brand-cyan">*</span>
              </Label>
              <Input
                id="template-name"
                value={name}
                maxLength={200}
                placeholder="Ej. Promo fin de semana"
                aria-invalid={invalid}
                aria-describedby={invalid ? 'template-name-error' : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  setInvalid(false);
                }}
              />
              {invalid && (
                <p id="template-name-error" role="alert" className="text-xs text-destructive">
                  Introduce un nombre de entre 1 y 200 caracteres.
                </p>
              )}
            </div>
          </FormSection>
          <TemplateVisualSettings
            design={design}
            onChange={(value) => {
              setDesign(value);
              setSelectedBase(null);
            }}
            disabled={blocked}
          />
          {template ? (
            <StyleReferencesField
              template={template}
              disabled={dirty || pending}
              onPendingChange={setReferencesPending}
            />
          ) : (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="text-sm font-semibold">Referencias de estilo</h2>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Guarda la plantilla primero. Después podrás añadir hasta dos flyers de referencia
                desde su edición.
              </p>
            </section>
          )}
          {error}
        </fieldset>
        <aside
          className="min-w-0 space-y-4 xl:sticky xl:top-[88px]"
          aria-label="Vista previa de la plantilla"
        >
          <section className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center justify-between gap-3 p-5">
              <h2 className="text-sm font-semibold">Vista previa</h2>
              <span className="rounded-full border border-brand-violet/30 bg-brand-violet/10 px-2.5 py-1 font-mono text-[11px] text-[#a97cff]">
                {size.width} × {size.height}
              </span>
            </div>
            <div className="bg-control p-5">
              <TemplateDesignPreview design={design} />
            </div>
            <dl className="grid grid-cols-2 gap-4 border-t p-5 text-xs">
              <div>
                <dt className="text-muted-foreground">Composición</dt>
                <dd className="mt-1 font-medium">{COMPOSITION_LABELS[design.composition]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Estilo</dt>
                <dd className="mt-1 font-medium">{STYLE_LABELS[design.style]}</dd>
              </div>
            </dl>
          </section>
          <p className="flex gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Los textos y colores de la muestra son ilustrativos. El flyer de la campaña usa tus
            datos y tu kit de marca.
          </p>
        </aside>
      </div>
      <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t bg-background/95 py-4 backdrop-blur xl:static xl:border-0">
        {actions}
      </div>
    </form>
  );
}

'use client';
import { Megaphone, Package, LayoutGrid } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Product } from '@/features/products/types/product.types';
import type { StoredTemplate } from '@/features/templates/types/stored-template.types';
import {
  campaignInput,
  CONDITIONS_MAX_LENGTH,
  INSTRUCTIONS_MAX_LENGTH,
  OCCASION_MAX_LENGTH,
  type CampaignDraft,
} from '../schemas/stored-campaign-input';
import {
  campaignObjectiveLabels,
  type CampaignObjective,
  type CreateStoredCampaignInput,
} from '../types/stored-campaign.types';
import { useCampaignOptions } from '../hooks/use-campaign-options';
import { CampaignOptionSelect } from './campaign-option-select';
import { CampaignImage } from './campaign-image';

const selectClass = 'w-full rounded-lg border bg-background p-2.5 text-sm';

// Formulario del brief: lo usan la creación y la edición del borrador.
export function CampaignBriefForm({
  initialDraft,
  initialProductId = null,
  initialTemplateId = null,
  submitLabel,
  pending,
  cancelHref,
  onSubmit,
}: {
  initialDraft: CampaignDraft;
  initialProductId?: string | null;
  initialTemplateId?: string | null;
  submitLabel: string;
  pending: boolean;
  cancelHref: string;
  onSubmit: (input: CreateStoredCampaignInput) => Promise<void>;
}) {
  const router = useRouter();
  const { products, templates } = useCampaignOptions();
  const [selectedProduct, setProduct] = useState<Product | null>(null);
  const [selectedTemplate, setTemplate] = useState<StoredTemplate | null>(null);
  // Al editar, la selección inicial sale de la campaña hasta que el usuario elija otra.
  const product =
    selectedProduct ?? products.data?.find((item) => item.id === initialProductId) ?? null;
  const template =
    selectedTemplate ?? templates.data?.find((item) => item.id === initialTemplateId) ?? null;
  const [draft, setDraft] = useState<CampaignDraft>(initialDraft);
  const [error, setError] = useState('');
  function change<K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  const hasPromotion = Boolean(draft.promotionPrice.trim());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError('');
    if (!product || !template) {
      setError('Selecciona un producto y una plantilla.');
      return;
    }
    try {
      await onSubmit(campaignInput(draft, product, template));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la campaña.');
    }
  }
  return (
    <form onSubmit={submit} className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
      <fieldset disabled={pending} className="min-w-0 space-y-6 rounded-xl border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Información de la campaña</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prepara tu mensaje y selecciona los elementos de tu promoción.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-title">Título</Label>
          <Input
            id="campaign-title"
            required
            maxLength={200}
            value={draft.title}
            onChange={(e) => change('title', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Es interno; no aparece en el flyer.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="campaign-objective">Objetivo</Label>
            <select
              id="campaign-objective"
              className={selectClass}
              value={draft.objective}
              onChange={(e) => change('objective', e.target.value as CampaignObjective)}
            >
              {Object.entries(campaignObjectiveLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-occasion">Ocasión (opcional)</Label>
            <Input
              id="campaign-occasion"
              maxLength={OCCASION_MAX_LENGTH}
              placeholder="Ej. Navidad, Día de la Madre"
              value={draft.occasion}
              onChange={(e) => change('occasion', e.target.value)}
            />
          </div>
        </div>
        <section className="space-y-3">
          <Label htmlFor="campaign-product">Producto o servicio</Label>
          <CampaignOptionSelect
            id="campaign-product"
            items={products.data ?? []}
            value={product}
            onChange={setProduct}
            placeholder="Buscar producto por nombre..."
            disabled={pending || products.isLoading || Boolean(products.error)}
          />
          {products.isLoading && <p role="status">Cargando productos…</p>}
          {products.error && (
            <div role="alert">
              <p>{products.error.message}</p>
              <Button type="button" onClick={() => void products.refetch()}>
                Reintentar productos
              </Button>
            </div>
          )}
          {products.data?.length === 0 && <p>No hay productos registrados.</p>}
          {product && (
            <div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-3 sm:p-4">
              <CampaignImage
                variant="thumbnail"
                url={product.imageUrl}
                alt={product.name}
                emptyLabel={
                  product.imageAssetIds.length
                    ? 'La imagen guardada aún no está disponible para visualizar.'
                    : 'Guarda una imagen en el producto o servicio antes de generar el flyer.'
                }
              />
              <div className="min-w-0 space-y-1">
                <p className="text-xs text-muted-foreground">
                  {product.kind === 'PRODUCT' ? 'Producto seleccionado' : 'Servicio seleccionado'}
                </p>
                <p className="break-words font-medium">{product.name}</p>
                <p className="text-sm">
                  Precio regular:{' '}
                  <span className="font-semibold">
                    {new Intl.NumberFormat('es-PE', {
                      style: 'currency',
                      currency: product.regularPrice.currency,
                    }).format(product.regularPrice.amountMinor / 100)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {product.imageUrl
                    ? 'Esta imagen se usará automáticamente para generar tu publicidad.'
                    : product.imageAssetIds.length
                      ? 'La imagen guardada aún no está disponible para visualizar.'
                      : 'Agrega una imagen al producto antes de generar tu publicidad.'}
                </p>
              </div>
            </div>
          )}
        </section>
        <section className="space-y-3">
          <Label htmlFor="campaign-template">Plantilla</Label>
          <CampaignOptionSelect
            id="campaign-template"
            items={templates.data ?? []}
            value={template}
            onChange={setTemplate}
            placeholder="Buscar plantilla por nombre..."
            disabled={pending || templates.isLoading || Boolean(templates.error)}
          />
          {templates.isLoading && <p role="status">Cargando plantillas…</p>}
          {templates.error && (
            <div role="alert">
              <p>{templates.error.message}</p>
              <Button type="button" onClick={() => void templates.refetch()}>
                Reintentar plantillas
              </Button>
            </div>
          )}
          {templates.data?.length === 0 && <p>No hay plantillas registradas.</p>}
          {template && (
            <p>
              Se utilizará la revisión {template.currentRevision.number} ·{' '}
              {template.currentRevision.dimensions.width} ×{' '}
              {template.currentRevision.dimensions.height} px.
            </p>
          )}
        </section>
        <div className="space-y-2">
          <Label htmlFor="campaign-cta">Llamada a la acción (CTA)</Label>
          <Input
            id="campaign-cta"
            required
            maxLength={200}
            value={draft.cta}
            onChange={(e) => change('cta', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-instructions">Indicaciones creativas (opcional)</Label>
          <Textarea
            id="campaign-instructions"
            maxLength={INSTRUCTIONS_MAX_LENGTH}
            placeholder="Ej. ambiente navideño sutil, sin Papá Noel"
            value={draft.instructions}
            onChange={(e) => change('instructions', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Orientan la ambientación del flyer; no cambian sus textos ni precios.
          </p>
        </div>
        <div className="space-y-4 border-t pt-5">
          <div className="space-y-2">
            <Label htmlFor="campaign-price">
              Precio promocional (opcional){product ? ` · ${product.regularPrice.currency}` : ''}
            </Label>
            <Input
              id="campaign-price"
              inputMode="decimal"
              value={draft.promotionPrice}
              onChange={(e) => change('promotionPrice', e.target.value)}
            />
          </div>
          <fieldset disabled={!hasPromotion} className="space-y-4 disabled:opacity-60">
            <p className="text-sm text-muted-foreground">
              Las fechas son opcionales y se interpretan en la zona horaria de este dispositivo.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaign-start">Inicio de promoción</Label>
                <Input
                  id="campaign-start"
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(e) => change('startsAt', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-end">Fin de promoción</Label>
                <Input
                  id="campaign-end"
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(e) => change('endsAt', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-conditions">Condiciones (opcional)</Label>
              <Input
                id="campaign-conditions"
                maxLength={CONDITIONS_MAX_LENGTH}
                placeholder="Ej. Válido solo en tienda. Hasta agotar stock."
                value={draft.conditions}
                onChange={(e) => change('conditions', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se imprimen tal cual en el flyer, como texto legal.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <Label id="campaign-discount-label" htmlFor="campaign-discount">
                Mostrar el porcentaje de descuento
              </Label>
              <Switch
                id="campaign-discount"
                aria-labelledby="campaign-discount-label"
                checked={draft.showDiscount}
                onCheckedChange={(checked) => change('showDiscount', checked)}
              />
            </div>
          </fieldset>
        </div>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={!product || !template}>
            {pending ? 'Guardando…' : submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(cancelHref)}>
            Cancelar
          </Button>
        </div>
      </fieldset>
      <aside className="space-y-6 rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Resumen de campaña</h2>
        <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-5 text-center">
          <Megaphone className="size-10 text-primary" />
          <p className="mt-4 break-words font-semibold">{draft.title || 'Tu próxima campaña'}</p>
          <p className="mt-2 break-words text-sm text-muted-foreground">
            {draft.cta || 'Agrega una llamada a la acción'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {campaignObjectiveLabels[draft.objective]}
            {draft.occasion.trim() ? ` · ${draft.occasion.trim()}` : ''}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <Package className="size-5 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Producto o servicio</p>
            <p className="mt-1 break-words font-medium">{product?.name || 'Sin seleccionar'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <LayoutGrid className="size-5 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Plantilla</p>
            <p className="mt-1 break-words font-medium">{template?.name || 'Sin seleccionar'}</p>
            {template && (
              <p className="text-xs text-muted-foreground">
                Revisión {template.currentRevision.number}
              </p>
            )}
          </div>
        </div>
        {hasPromotion && (
          <div className="border-t pt-5">
            <p className="text-xs text-muted-foreground">Precio promocional</p>
            <p className="mt-2 text-2xl font-semibold">
              {product?.regularPrice.currency} {draft.promotionPrice}
            </p>
          </div>
        )}
      </aside>
    </form>
  );
}

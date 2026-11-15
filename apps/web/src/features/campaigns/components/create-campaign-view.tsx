'use client';
import { Megaphone, Package, LayoutGrid } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Product } from '@/features/products/types/product.types';
import type { StoredTemplate } from '@/features/templates/types/stored-template.types';
import { useCreateStoredCampaign } from '../hooks/use-stored-campaigns';
import { campaignInput, type CampaignDraft } from '../schemas/stored-campaign-input';
import { useCampaignOptions } from '../hooks/use-campaign-options';
import { CampaignOptionSelect } from './campaign-option-select';
import { CampaignImage } from './campaign-image';

export function CreateCampaignView() {
  const router = useRouter();
  const create = useCreateStoredCampaign();
  const { products, templates } = useCampaignOptions();
  const [product, setProduct] = useState<Product | null>(null);
  const [template, setTemplate] = useState<StoredTemplate | null>(null);
  const [draft, setDraft] = useState<CampaignDraft>({
    title: '',
    cta: '',
    instructions: '',
    promotionPrice: '',
    startsAt: '',
    endsAt: '',
  });
  const [error, setError] = useState('');
  function change(key: keyof CampaignDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (create.isPending) return;
    setError('');
    if (!product || !template) {
      setError('Selecciona un producto y una plantilla.');
      return;
    }
    try {
      const campaign = await create.mutateAsync(campaignInput(draft, product, template));
      router.push(`/campaigns/${campaign.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la campaña.');
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva campaña"
        description="Selecciona producto, revisión de plantilla y mensaje promocional."
      />
      <form onSubmit={submit} className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
        <fieldset
          disabled={create.isPending}
          className="min-w-0 space-y-6 rounded-xl border bg-card p-6"
        >
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
          </div>
          <section className="space-y-3">
            <Label htmlFor="campaign-product">Producto o servicio</Label>
            <CampaignOptionSelect
              id="campaign-product"
              items={products.data ?? []}
              value={product}
              onChange={setProduct}
              placeholder="Buscar producto por nombre..."
              disabled={create.isPending || products.isLoading || Boolean(products.error)}
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
              disabled={create.isPending || templates.isLoading || Boolean(templates.error)}
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
            <Label htmlFor="campaign-instructions">Instrucciones adicionales</Label>
            <Textarea
              id="campaign-instructions"
              maxLength={5000}
              value={draft.instructions}
              onChange={(e) => change('instructions', e.target.value)}
            />
          </div>
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
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="submit" disabled={!product || !template}>
              {create.isPending ? 'Guardando…' : 'Crear campaña'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/campaigns')}>
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
          {draft.promotionPrice && (
            <div className="border-t pt-5">
              <p className="text-xs text-muted-foreground">Precio promocional</p>
              <p className="mt-2 text-2xl font-semibold">
                {product?.regularPrice.currency} {draft.promotionPrice}
              </p>
            </div>
          )}
        </aside>
      </form>
    </div>
  );
}

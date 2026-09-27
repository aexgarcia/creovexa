'use client';
import { Megaphone, Package, LayoutGrid } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProducts } from '@/features/products/hooks/use-products';
import type { Product } from '@/features/products/types/product.types';
import { useTemplates } from '@/features/templates/hooks/use-templates';
import type { StoredTemplate } from '@/features/templates/types/stored-template.types';
import { useCreateStoredCampaign } from '../hooks/use-stored-campaigns';
import { campaignInput, type CampaignDraft } from '../schemas/stored-campaign-input';
import { CampaignPagination } from './campaign-pagination';

export function CreateCampaignView() {
  const router = useRouter();
  const create = useCreateStoredCampaign();
  const [productPage, setProductPage] = useState(1),
    [templatePage, setTemplatePage] = useState(1);
  const products = useProducts(productPage),
    templates = useTemplates(templatePage);
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
            <select
              id="campaign-product"
              className="w-full rounded-md border bg-background p-2"
              value={product?.id ?? ''}
              onChange={(e) =>
                setProduct(products.data?.find((item) => item.id === e.target.value) ?? null)
              }
            >
              <option value="">Seleccionar producto</option>
              {product && !products.data?.some((item) => item.id === product.id) && (
                <option value={product.id}>{product.name}</option>
              )}
              {products.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {products.isLoading && <p role="status">Cargando productos…</p>}
            {products.error && (
              <div role="alert">
                <p>{products.error.message}</p>
                <Button type="button" onClick={() => void products.refetch()}>
                  Reintentar productos
                </Button>
              </div>
            )}
            {products.data?.length === 0 && <p>No hay productos en esta página.</p>}
            <CampaignPagination
              page={productPage}
              totalPages={products.meta?.totalPages}
              pending={products.isLoading}
              onChange={setProductPage}
            />
            {product && (
              <p>
                Precio regular:{' '}
                {new Intl.NumberFormat('es-PE', {
                  style: 'currency',
                  currency: product.regularPrice.currency,
                }).format(product.regularPrice.amountMinor / 100)}
              </p>
            )}
          </section>
          <section className="space-y-3">
            <Label htmlFor="campaign-template">Plantilla</Label>
            <select
              id="campaign-template"
              className="w-full rounded-md border bg-background p-2"
              value={template?.id ?? ''}
              onChange={(e) =>
                setTemplate(templates.data?.find((item) => item.id === e.target.value) ?? null)
              }
            >
              <option value="">Seleccionar plantilla</option>
              {template && !templates.data?.some((item) => item.id === template.id) && (
                <option value={template.id}>{template.name}</option>
              )}
              {templates.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {templates.isLoading && <p role="status">Cargando plantillas…</p>}
            {templates.error && (
              <div role="alert">
                <p>{templates.error.message}</p>
                <Button type="button" onClick={() => void templates.refetch()}>
                  Reintentar plantillas
                </Button>
              </div>
            )}
            {templates.data?.length === 0 && <p>No hay plantillas en esta página.</p>}
            <CampaignPagination
              page={templatePage}
              totalPages={templates.meta?.totalPages}
              pending={templates.isLoading}
              onChange={setTemplatePage}
            />
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

import { Info, LayoutGrid, Megaphone, Package, ArrowRight, MessageCircle } from 'lucide-react';
import type { Product } from '@/features/products/types/product.types';
import type { StoredTemplate } from '@/features/templates/types/stored-template.types';
import { FORMAT_LABELS, STYLE_LABELS } from '@/features/templates/types/template-design-options';
import { amountMinor } from '@/features/products/schemas/product-price';
import type { CampaignDraft } from '../schemas/stored-campaign-input';
import { campaignObjectiveLabels } from '../types/stored-campaign.types';

export function CampaignBriefSummary({
  draft,
  product,
  template,
}: {
  draft: CampaignDraft;
  product: Product | null;
  template: StoredTemplate | null;
}) {
  const price = amountMinor(draft.promotionPrice);
  const hasPromotion = Boolean(draft.promotionPrice.trim());
  const validPrice = product && price !== null && price < product.regularPrice.amountMinor;
  const money = (minor: number) =>
    new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: product?.regularPrice.currency ?? 'PEN',
    }).format(minor / 100);
  return (
    <aside className="min-w-0 space-y-4 xl:sticky xl:top-[88px]" aria-label="Resumen del brief">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between gap-3 border-b p-5">
          <h2 className="text-sm font-semibold">Tu campaña en resumen</h2>
          <span className="rounded-full border bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
            Borrador
          </span>
        </div>
        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <Megaphone aria-hidden="true" className="mb-3 size-5 text-brand-cyan" />
            <h3 className="break-words text-base font-semibold tracking-tight">
              {draft.title.trim() || 'Tu próxima campaña'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {campaignObjectiveLabels[draft.objective]}
            </p>
            {draft.occasion.trim() && (
              <p className="mt-2 break-words text-xs text-brand-cyan">{draft.occasion.trim()}</p>
            )}
          </div>
          <div className="flex items-start gap-3">
            <Package aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-cyan" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Producto o servicio
              </p>
              <p className="mt-1 break-words text-sm font-medium">
                {product?.name || 'Sin seleccionar'}
              </p>
              {product && (
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  Precio regular · {money(product.regularPrice.amountMinor)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <LayoutGrid aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-cyan" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Plantilla
              </p>
              <p className="mt-1 break-words text-sm font-medium">
                {template?.name || 'Sin seleccionar'}
              </p>
              {template && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                  <span className="rounded border px-2 py-0.5">
                    {FORMAT_LABELS[template.currentRevision.design.format]}
                  </span>
                  <span className="rounded border px-2 py-0.5">
                    {STYLE_LABELS[template.currentRevision.design.style]}
                  </span>
                  <span className="rounded border px-2 py-0.5">
                    Revisión {template.currentRevision.number}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <MessageCircle aria-hidden="true" className="size-3.5" /> Llamada a la acción
            </p>
            <p className="break-words text-sm">
              {draft.cta.trim() || '¿Qué quieres que haga tu audiencia?'}
            </p>
          </div>
          {hasPromotion && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <p className="text-xs text-muted-foreground">Precio promocional</p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
                {validPrice ? money(price!) : 'Por revisar'}
              </p>
              {!validPrice && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Elige un producto e ingresa un precio válido inferior al regular.
                </p>
              )}
              {draft.conditions.trim() && (
                <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">
                  {draft.conditions.trim()}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
      <div className="rounded-2xl border bg-card p-5">
        <p className="text-sm font-medium">Después de guardar</p>
        <ol className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {['Borrador', 'Textos', 'Flyer', 'Revisión'].map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              {step}
              {index < 3 && <ArrowRight aria-hidden="true" className="size-3" />}
            </li>
          ))}
        </ol>
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Guardar prepara el brief. Luego podrás solicitar los textos y el flyer; todavía no se
            genera ni publica contenido.
          </span>
        </p>
      </div>
    </aside>
  );
}

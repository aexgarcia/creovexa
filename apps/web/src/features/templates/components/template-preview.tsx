import { ImageIcon, Sparkles } from 'lucide-react';

import type { MarketingTemplate } from '../types/template.types';

interface TemplatePreviewProps {
  template: MarketingTemplate | Pick<MarketingTemplate, 'width' | 'height' | 'settings'>;
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  const aspectRatio = template.width / template.height;

  return (
    <div
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-background to-muted shadow-sm"
      style={{
        aspectRatio: String(aspectRatio),
      }}
    >
      <div className="absolute inset-0 flex flex-col justify-between p-6">
        <div className="flex items-center justify-between">
          {template.settings.showLogo ? (
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" />
            </div>
          ) : (
            <div />
          )}

          <span className="rounded-full border bg-background/70 px-3 py-1 text-[10px] font-medium backdrop-blur">
            PROMOCIÓN
          </span>
        </div>

        {template.settings.showMainImage && (
          <div className="flex flex-1 items-center justify-center py-6">
            <div className="flex size-28 items-center justify-center rounded-2xl border border-dashed bg-background/40">
              <ImageIcon className="size-9 text-muted-foreground" />
            </div>
          </div>
        )}

        <div>
          {template.settings.showHeadline && (
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Oferta especial
            </p>
          )}

          <h3 className="mt-1 text-2xl font-bold tracking-tight">Producto</h3>

          {(template.settings.showPromotionPrice || template.settings.showRegularPrice) && (
            <div className="mt-3 flex items-end gap-2">
              {template.settings.showPromotionPrice && (
                <span className="text-4xl font-bold">S/ 99</span>
              )}

              {template.settings.showRegularPrice && (
                <span className="pb-1 text-sm text-muted-foreground line-through">S/ 120</span>
              )}
            </div>
          )}

          {template.settings.showCta && (
            <div className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              Comprar ahora
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

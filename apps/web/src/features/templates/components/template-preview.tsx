import { ImageIcon, Sparkles } from 'lucide-react';
import Image from 'next/image';

import type { MarketingTemplate } from '../types/template.types';
import type { TemplateDesign } from '../types/template-design';

interface TemplatePreviewProps {
  template: MarketingTemplate | Pick<MarketingTemplate, 'width' | 'height' | 'settings'>;
  mainImage?: string | null;
  design?: TemplateDesign;
}

export function TemplatePreview({ template, mainImage, design }: TemplatePreviewProps) {
  const aspectRatio = template.width / template.height;
  if (design) {
    const focus = design.layout === 'PRODUCT_FOCUS';
    const coral = design.palette === 'CORAL';
    const settings = design.settings;
    return (
      <div
        data-layout={design.layout}
        data-palette={design.palette}
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border text-white shadow-sm"
        style={{
          aspectRatio: String(aspectRatio),
          containerType: 'inline-size',
          background: coral
            ? 'radial-gradient(ellipse at 100% 0%, #a04543, transparent 55%), #251214'
            : 'radial-gradient(ellipse at 100% 0%, #4052a0, transparent 55%), #101321',
        }}
      >
        {settings.showMainImage && (
          <div
            className={
              focus
                ? 'absolute left-[6%] top-[30.5%] flex h-[33.5%] w-[88%] items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2'
                : 'absolute inset-0 flex items-center justify-center'
            }
          >
            {mainImage ? (
              <Image
                src={mainImage}
                alt="Imagen principal de ejemplo"
                fill
                unoptimized
                className="object-contain"
              />
            ) : (
              <ImageIcon
                aria-label="Imagen principal de ejemplo"
                className={focus ? 'size-16 text-white/40' : 'size-24 text-white/20'}
              />
            )}
          </div>
        )}
        {!focus && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
        )}
        <div className="absolute left-[6%] right-[6%] top-[5%] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {settings.showLogo && (
              <div className="flex size-7 items-center justify-center rounded-lg bg-white p-1.5 text-slate-800">
                <Sparkles className="size-4" />
              </div>
            )}
            <span style={{ fontSize: '2.5cqw' }} className="font-semibold">
              Tu marca
            </span>
          </div>
          <span
            style={{ fontSize: '2cqw' }}
            className="rounded-full border border-white/25 bg-white/10 px-2 py-1"
          >
            Promoción
          </span>
        </div>
        {settings.showHeadline && (
          <p
            className="absolute left-[6%] right-[6%] top-[14.5%] font-extrabold leading-tight tracking-tight"
            style={{ fontSize: '5.5cqw' }}
          >
            Tu próxima gran oferta empieza aquí
          </p>
        )}
        <div className="absolute bottom-[5%] left-[6%] right-[6%]">
          <p style={{ fontSize: '2.4cqw' }} className="font-semibold text-white/80">
            Nombre del producto
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              {settings.showRegularPrice && (
                <p
                  style={{ fontSize: settings.showPromotionPrice ? '2.2cqw' : '6cqw' }}
                  className={
                    settings.showPromotionPrice ? 'text-white/65 line-through' : 'font-extrabold'
                  }
                >
                  {settings.showPromotionPrice ? 'Precio regular: ' : ''}PEN 150.00
                </p>
              )}
              {settings.showPromotionPrice && (
                <p style={{ fontSize: '6cqw' }} className="font-extrabold leading-tight">
                  PEN 120.00
                </p>
              )}
            </div>
            {settings.showCta && (
              <div
                className="max-w-[36%] rounded-lg px-3 py-3 text-center font-bold"
                style={{ fontSize: '2.7cqw', background: coral ? '#c74335' : '#4b63fb' }}
              >
                Comprar ahora
              </div>
            )}
          </div>
          <p
            className="mt-2 border-t border-white/15 pt-2 text-white/70"
            style={{ fontSize: '1.85cqw' }}
          >
            Fechas de la promoción
          </p>
        </div>
      </div>
    );
  }

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
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt="Imagen del producto o servicio"
                  width={112}
                  height={112}
                  unoptimized
                  className="h-full w-full rounded-2xl object-contain"
                />
              ) : (
                <ImageIcon className="size-9 text-muted-foreground" />
              )}
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

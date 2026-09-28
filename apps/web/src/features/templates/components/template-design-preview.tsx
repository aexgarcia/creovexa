import { TemplatePreview } from './template-preview';

/** Visual sample only; it is not a saved or rendered campaign asset. */
export function TemplateDesignPreview({
  width = 1080,
  height = 1080,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <div className="space-y-3">
      <TemplatePreview
        template={{
          width,
          height,
          settings: {
            showLogo: true,
            showRegularPrice: true,
            showPromotionPrice: true,
            showHeadline: true,
            showCta: true,
            showMainImage: true,
          },
        }}
      />
      <p className="text-center text-xs text-muted-foreground">
        Diseño de ejemplo · Personalización próximamente
      </p>
    </div>
  );
}

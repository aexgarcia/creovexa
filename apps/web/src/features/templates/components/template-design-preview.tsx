import { TemplatePreview } from './template-preview';
import { defaultTemplateDesign, type TemplateDesign } from '../types/template-design';

/** Visual sample only; it is not a saved or rendered campaign asset. */
export function TemplateDesignPreview({
  width = 1080,
  height = 1080,
  design = defaultTemplateDesign(),
}: {
  width?: number;
  height?: number;
  design?: TemplateDesign;
}) {
  return (
    <div className="space-y-3">
      <TemplatePreview
        design={design}
        template={{
          width,
          height,
          settings: design.settings,
        }}
      />
      <p className="text-center text-xs text-muted-foreground">
        Vista orientativa con datos de ejemplo. El flyer usará la imagen y los datos de tu campaña.
      </p>
    </div>
  );
}

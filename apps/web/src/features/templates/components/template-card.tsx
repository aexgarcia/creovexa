import { TemplateDesignPreview } from './template-design-preview';
import { Badge } from '@/components/ui/badge';
import type { StoredTemplate } from '../types/stored-template.types';
import { TemplateActions } from './template-actions';
import type { TemplateComposition } from '../types/template-design';

const COMPOSITION_LABEL: Record<TemplateComposition, string> = {
  PRODUCT_HERO: 'Producto protagonista',
  PRODUCT_PANEL: 'Producto en panel',
  SCENE: 'Escena ambientada',
  SPLIT: 'Dividida',
  TYPOGRAPHIC: 'Tipográfica',
};

export function TemplateCard({ template }: { template: StoredTemplate }) {
  const revision = template.currentRevision;
  return (
    <article className="group overflow-hidden rounded-xl border bg-card transition hover:border-primary/40 hover:shadow-md">
      <div className="bg-muted/20 p-4">
        <TemplateDesignPreview design={revision.design} />
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="break-words font-semibold">{template.name}</h3>
          <TemplateActions templateId={template.id} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Revisión {revision.number}</Badge>
          <Badge variant="outline">
            {revision.dimensions.width} × {revision.dimensions.height} px
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {COMPOSITION_LABEL[revision.design.composition]}
          {' · '}
          {revision.design.mode === 'DARK' ? 'Modo oscuro' : 'Modo claro'}
        </p>
      </div>
    </article>
  );
}

import { TemplateDesignPreview } from './template-design-preview';
import { Badge } from '@/components/ui/badge';
import type { StoredTemplate } from '../types/stored-template.types';
import { TemplateActions } from './template-actions';

export function TemplateCard({ template }: { template: StoredTemplate }) {
  const revision = template.currentRevision;
  return (
    <article className="group overflow-hidden rounded-xl border bg-card transition hover:border-primary/40 hover:shadow-md">
      <div className="bg-muted/20 p-4">
        <TemplateDesignPreview
          width={revision.dimensions.width}
          height={revision.dimensions.height}
        />
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
        <p className="text-sm text-muted-foreground">Personalización visual próximamente.</p>
      </div>
    </article>
  );
}

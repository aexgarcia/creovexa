import { Badge } from '@/components/ui/badge';
import type { StoredTemplate } from '../types/stored-template.types';
import { TemplateActions } from './template-actions';

export function TemplateCard({ template }: { template: StoredTemplate }) {
  const revision = template.currentRevision;
  return (
    <article className="space-y-4 rounded-xl border bg-card p-5">
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
    </article>
  );
}

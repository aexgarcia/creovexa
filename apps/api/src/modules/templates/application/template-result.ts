import type { Template } from '../domain/entities/template.js';
import type { FlyerDesignData } from '#app/domain/value-objects/flyer-design';

export interface TemplateResult {
  id: string;
  organizationId: string;
  name: string;
  currentRevision: {
    id: string;
    templateId: string;
    organizationId: string;
    number: number;
    dimensions: { width: number; height: number };
    design: FlyerDesignData;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function templateResult(template: Template): TemplateResult {
  const revision = template.currentRevision;
  return {
    id: template.id,
    organizationId: template.organizationId,
    name: template.name,
    currentRevision: {
      id: revision.id,
      templateId: revision.templateId,
      organizationId: revision.organizationId,
      number: revision.number,
      dimensions: { width: revision.dimensions.width, height: revision.dimensions.height },
      design: revision.design,
      createdAt: revision.createdAt.toISOString(),
    },
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

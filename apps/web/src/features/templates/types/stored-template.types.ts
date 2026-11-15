import type { TemplateDesign } from './template-design';

export interface StoredTemplate {
  id: string;
  organizationId: string;
  name: string;
  currentRevision: {
    id: string;
    number: number;
    dimensions: { width: number; height: number };
    design: TemplateDesign;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}
// Las dimensiones salen del formato del diseño.
export interface CreateStoredTemplateInput {
  name: string;
  design?: TemplateDesign;
}

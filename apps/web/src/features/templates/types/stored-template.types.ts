export interface StoredTemplate {
  id: string;
  organizationId: string;
  name: string;
  currentRevision: {
    id: string;
    number: number;
    dimensions: { width: number; height: number };
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}
export interface CreateStoredTemplateInput {
  name: string;
  dimensions: { width: number; height: number };
}

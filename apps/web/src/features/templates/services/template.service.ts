import { apiRequest, type ApiPage } from '@/lib/api-client';
import type { CreateStoredTemplateInput, StoredTemplate } from '../types/stored-template.types';
import type { BaseTemplate, TemplateDesign } from '../types/template-design';

class TemplateService {
  async update(
    id: string,
    input: { name: string; expectedRevisionId: string; design?: TemplateDesign },
  ): Promise<StoredTemplate> {
    return (
      await apiRequest<{ data: StoredTemplate }>(`/templates/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
    ).data;
  }

  findAll(page = 1, signal?: AbortSignal): Promise<ApiPage<StoredTemplate>> {
    return apiRequest(`/templates?page=${page}&limit=20`, { signal });
  }
  async findById(id: string, signal?: AbortSignal): Promise<StoredTemplate> {
    const response = await apiRequest<{ data: StoredTemplate }>(
      `/templates/${encodeURIComponent(id)}`,
      { signal },
    );
    return response.data;
  }
  async create(input: CreateStoredTemplateInput): Promise<StoredTemplate> {
    const response = await apiRequest<{ data: StoredTemplate }>('/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name.trim(),
        design: input.design,
      }),
    });
    return response.data;
  }
  // Plantillas de ejemplo del sistema; no pertenecen a ninguna empresa.
  async findBase(signal?: AbortSignal): Promise<BaseTemplate[]> {
    return (await apiRequest<{ data: BaseTemplate[] }>('/templates/base', { signal })).data;
  }
}
export const templateService = new TemplateService();

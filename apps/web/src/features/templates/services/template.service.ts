import { apiRequest, type ApiPage } from '@/lib/api-client';
import type { CreateStoredTemplateInput, StoredTemplate } from '../types/stored-template.types';

class TemplateService {
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
      body: JSON.stringify({ name: input.name.trim(), dimensions: input.dimensions }),
    });
    return response.data;
  }
}
export const templateService = new TemplateService();

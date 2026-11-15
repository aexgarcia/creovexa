import type { ApiPage } from '@/lib/api-client';

// La API sigue paginada; el formulario busca en todo el catálogo, no solo en la primera página.
export async function loadCampaignOptions<T extends { id: string }>(
  fetchPage: (page: number, signal?: AbortSignal) => Promise<ApiPage<T>>,
  signal?: AbortSignal,
): Promise<T[]> {
  const items = new Map<string, T>();
  let lastPage = 1;
  for (let page = 1; page <= lastPage; page++) {
    signal?.throwIfAborted();
    const result = await fetchPage(page, signal);
    if (page === 1) lastPage = result.meta.totalPages;
    for (const item of result.data) items.set(item.id, item);
  }
  return [...items.values()];
}

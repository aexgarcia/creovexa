'use client';
import { useQuery } from '@tanstack/react-query';
import { templateService } from '../services/template.service';
import type { CatalogStatus } from '@/types/catalog-status';
export function useTemplates(page = 1, status: CatalogStatus = 'active') {
  const query = useQuery({
    queryKey: ['templates', 'list', page, status],
    queryFn: ({ signal }) => templateService.findAll(page, signal, status),
    retry: false,
  });
  return { ...query, data: query.data?.data, meta: query.data?.meta };
}

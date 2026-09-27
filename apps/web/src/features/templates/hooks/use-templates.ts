'use client';
import { useQuery } from '@tanstack/react-query';
import { templateService } from '../services/template.service';
export function useTemplates(page = 1) {
  const query = useQuery({
    queryKey: ['templates', 'list', page],
    queryFn: ({ signal }) => templateService.findAll(page, signal),
    retry: false,
  });
  return { ...query, data: query.data?.data, meta: query.data?.meta };
}

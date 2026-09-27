'use client';
import { useQuery } from '@tanstack/react-query';
import { templateService } from '../services/template.service';
export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: ({ signal }) => templateService.findById(id, signal),
    enabled: Boolean(id),
    retry: false,
  });
}

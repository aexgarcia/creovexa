'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { templateService } from '../services/template.service';

export function useArchiveTemplate(onChanged?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      templateService.setArchived(id, archived),
    retry: false,
    onSuccess: async (item) => {
      await client.cancelQueries({ queryKey: ['templates'] });
      client.setQueryData(['templates', item.id], item);
      await client.invalidateQueries({ queryKey: ['templates'] });
      toast.success(
        item.archivedAt
          ? 'Plantilla archivada. El historial se conserva.'
          : 'Plantilla restaurada.',
      );
      onChanged?.();
    },
    onError: (error) => toast.error(error.message),
  });
}

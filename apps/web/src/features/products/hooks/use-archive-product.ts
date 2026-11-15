'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { productService } from '../services/product.service';

export function useArchiveProduct(onChanged?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      productService.setArchived(id, archived),
    retry: false,
    onSuccess: async (item) => {
      await client.cancelQueries({ queryKey: ['products'] });
      client.setQueryData(['products', item.id], item);
      await client.invalidateQueries({ queryKey: ['products'] });
      toast.success(
        item.archivedAt ? 'Producto archivado. El historial se conserva.' : 'Producto restaurado.',
      );
      onChanged?.();
    },
    onError: (error) => toast.error(error.message),
  });
}

'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/product.service';

export function useUploadProductImage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => productService.uploadImage(id, file),
    onSuccess: async (product) => {
      client.setQueryData(['products', product.id], product);
      await client.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

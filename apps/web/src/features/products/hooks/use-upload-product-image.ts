'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/product.service';
import type { PhotoType } from '../types/product.types';

export function useUploadProductImage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, photoType }: { id: string; file: File; photoType: PhotoType }) =>
      productService.uploadImage(id, file, photoType),
    onSuccess: async (product) => {
      client.setQueryData(['products', product.id], product);
      await client.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

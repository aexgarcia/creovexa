'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { productService } from '../services/product.service';

import type { UpdateProductInput } from '../types/product.types';

interface UpdateProductVariables {
  id: string;
  input: UpdateProductInput;
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: UpdateProductVariables) => productService.update(id, input),

    onSuccess: async (product) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['products'],
        }),

        queryClient.invalidateQueries({
          queryKey: ['products', product.id],
        }),
      ]);
    },
  });
}

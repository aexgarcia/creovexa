'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import { productService } from '../services/product.service';

// Si el botón «Sugerir con IA» se muestra. Ante un error se oculta, sin avisar.
export function useSalesSuggestionsAvailable() {
  return useQuery({
    queryKey: ['products', 'sales-suggestions', 'status'],
    queryFn: ({ signal }) => productService.salesSuggestionsAvailable(signal),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useSuggestSalesData() {
  return useMutation({ mutationFn: productService.suggestSalesData.bind(productService) });
}

'use client';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/product.service';
export function useProducts(page = 1) {
  const query = useQuery({
    queryKey: ['products', 'list', page],
    queryFn: ({ signal }) => productService.findAll(page, signal),
    retry: false,
  });
  return { ...query, data: query.data?.data, meta: query.data?.meta };
}

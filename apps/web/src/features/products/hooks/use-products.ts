'use client';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/product.service';
import type { CatalogStatus } from '@/types/catalog-status';
export function useProducts(page = 1, status: CatalogStatus = 'active') {
  const query = useQuery({
    queryKey: ['products', 'list', page, status],
    queryFn: ({ signal }) => productService.findAll(page, signal, status),
    retry: false,
  });
  return { ...query, data: query.data?.data, meta: query.data?.meta };
}

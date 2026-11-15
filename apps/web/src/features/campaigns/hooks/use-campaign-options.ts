'use client';
import { useQuery } from '@tanstack/react-query';
import { productService } from '@/features/products/services/product.service';
import { templateService } from '@/features/templates/services/template.service';
import { loadCampaignOptions } from '../services/load-campaign-options';

export function useCampaignOptions() {
  const products = useQuery({
    queryKey: ['products', 'campaign-options'],
    queryFn: ({ signal }) =>
      loadCampaignOptions((page, signal) => productService.findAll(page, signal), signal),
    retry: false,
  });
  const templates = useQuery({
    queryKey: ['templates', 'campaign-options'],
    queryFn: ({ signal }) =>
      loadCampaignOptions((page, signal) => templateService.findAll(page, signal), signal),
    retry: false,
  });
  return { products, templates };
}

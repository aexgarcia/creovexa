'use client';

import { useQuery } from '@tanstack/react-query';

import { campaignService } from '../services/campaign.service';

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => campaignService.findById(id),
    enabled: Boolean(id),
  });
}

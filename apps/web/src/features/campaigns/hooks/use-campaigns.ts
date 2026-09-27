'use client';

import { useQuery } from '@tanstack/react-query';

import { campaignService } from '../services/campaign.service';

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignService.findAll(),
  });
}

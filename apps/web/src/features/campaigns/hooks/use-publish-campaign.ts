'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { campaignService } from '../services/campaign.service';

import type { Campaign, PublishCampaignInput } from '../types/campaign.types';

export function usePublishCampaign() {
  const queryClient = useQueryClient();

  return useMutation<Campaign, Error, PublishCampaignInput>({
    mutationFn: ({ campaignId, platforms }) => campaignService.publish(campaignId, platforms),

    onSuccess: async (campaign) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['campaigns', campaign.id],
        }),

        queryClient.invalidateQueries({
          queryKey: ['campaigns'],
        }),

        queryClient.invalidateQueries({
          queryKey: ['publications'],
        }),
      ]);
    },
  });
}

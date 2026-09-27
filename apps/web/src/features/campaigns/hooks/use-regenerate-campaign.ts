'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { campaignService } from '../services/campaign.service';

export function useRegenerateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignService.regenerate(id),

    onSuccess: async (campaign) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['campaigns', campaign.id],
        }),

        queryClient.invalidateQueries({
          queryKey: ['campaigns'],
        }),
      ]);
    },
  });
}

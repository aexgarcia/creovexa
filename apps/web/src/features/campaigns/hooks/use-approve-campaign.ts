'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { campaignService } from '../services/campaign.service';

export function useApproveCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignService.approve(id),

    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({
        queryKey: ['campaigns', campaign.id],
      });

      await queryClient.invalidateQueries({
        queryKey: ['campaigns'],
      });
    },
  });
}

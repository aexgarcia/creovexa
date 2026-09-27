'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { campaignService } from '../services/campaign.service';

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: campaignService.create.bind(campaignService),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['campaigns'],
      });
    },
  });
}

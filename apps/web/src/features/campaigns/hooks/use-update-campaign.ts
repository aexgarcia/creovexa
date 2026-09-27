'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { campaignService } from '../services/campaign.service';

import type { UpdateCampaignInput } from '../types/campaign.types';

interface UpdateCampaignVariables {
  id: string;
  input: UpdateCampaignInput;
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: UpdateCampaignVariables) => campaignService.update(id, input),

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

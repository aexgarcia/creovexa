'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignApi } from '../services/campaign-api.service';
export function useCampaignImage(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (generationId: string) => campaignApi.generateImage(id, generationId),
    retry: false,
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['stored-campaigns'] }),
        client.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}

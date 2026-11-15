'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignCopyService, type FlyerTextsInput } from '../services/campaign-copy.service';
import { GENERATION_POLL_MS, isInProgress } from '../types/generation-job';

export function useCampaignCopy(id: string, version: number) {
  const client = useQueryClient();
  const queryKey = ['campaign-copy', id, version];
  const query = useQuery({
    queryKey,
    enabled: Boolean(id),
    queryFn: ({ signal }) => campaignCopyService.get(id, signal),
    retry: false,
    refetchOnMount: 'always',
    // Sigue preguntando solo mientras el trabajo en segundo plano no haya terminado.
    refetchInterval: (current) => (isInProgress(current.state.data) ? GENERATION_POLL_MS : false),
  });
  const generate = useMutation({
    mutationFn: () => campaignCopyService.generate(id),
    retry: false,
    onSuccess: (status) => {
      client.setQueryData(queryKey, status);
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['stored-campaigns'] }),
        client.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
  const updateTexts = useMutation({
    mutationFn: (input: FlyerTextsInput) => campaignCopyService.updateFlyerTexts(id, input),
    retry: false,
    onSuccess: (status) => {
      client.setQueryData(queryKey, status);
    },
  });
  return { query, generate, updateTexts };
}

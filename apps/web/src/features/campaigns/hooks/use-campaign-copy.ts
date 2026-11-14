'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignCopyService } from '../services/campaign-copy.service';
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
    // Keep asking only while the background job has not finished.
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
  return { query, generate };
}

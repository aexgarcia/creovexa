'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignCopyService } from '../services/campaign-copy.service';
export function useCampaignCopy(id: string, version: number) {
  const client = useQueryClient();
  const queryKey = ['campaign-copy', id, version];
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => campaignCopyService.get(id, signal),
    retry: false,
    refetchOnMount: 'always',
  });
  const generate = useMutation({
    mutationFn: () => campaignCopyService.generate(id),
    retry: false,
    onSuccess: (copy) => {
      client.setQueryData(queryKey, copy);
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['stored-campaigns'] }),
        client.invalidateQueries({ queryKey: ['campaign-copy', id] }),
        client.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
  return { query, generate };
}

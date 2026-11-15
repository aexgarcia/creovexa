'use client';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { campaignApi } from '../services/campaign-api.service';

// Lo que cambia al regenerar o recuperar: la campaña, su historial y los trabajos de la versión vigente.
async function refreshCampaign(client: QueryClient, id: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: ['stored-campaigns'] }),
    client.invalidateQueries({ queryKey: ['campaign-versions', id] }),
    client.invalidateQueries({ queryKey: ['campaign-copy', id] }),
    client.invalidateQueries({ queryKey: ['campaign-image', id] }),
    client.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);
}

export function useCampaignVersions(id: string, version: number) {
  return useQuery({
    queryKey: ['campaign-versions', id, version],
    queryFn: ({ signal }) => campaignApi.versions(id, signal),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useRegenerateStoredCampaign(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => campaignApi.regenerate(id),
    retry: false,
    onSettled: () => refreshCampaign(client, id),
  });
}

export function useRestoreCampaignVersion(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { generationId: string; expectedVersion: number }) =>
      campaignApi.restoreVersion(id, input.generationId, input.expectedVersion),
    retry: false,
    onSuccess: (campaign) => {
      client.setQueryData(['stored-campaigns', id], campaign);
    },
    onSettled: () => refreshCampaign(client, id),
  });
}

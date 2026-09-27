'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignApi } from '../services/campaign-api.service';
export function useStoredCampaigns(page = 1) {
  return useQuery({
    queryKey: ['stored-campaigns', 'list', page],
    queryFn: ({ signal }) => campaignApi.list(page, signal),
    retry: false,
  });
}
export function useStoredCampaign(id: string) {
  return useQuery({
    queryKey: ['stored-campaigns', id],
    queryFn: ({ signal }) => campaignApi.get(id, signal),
    enabled: Boolean(id),
    retry: false,
  });
}
export function useCreateStoredCampaign() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: campaignApi.create,
    retry: false,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['stored-campaigns'] });
    },
  });
}
export function useApproveStoredCampaign(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (contentId: string) => campaignApi.approve(id, contentId),
    retry: false,
    onSuccess: async (campaign) => {
      client.setQueryData(['stored-campaigns', id], campaign);
      await client.invalidateQueries({ queryKey: ['stored-campaigns'] });
    },
  });
}

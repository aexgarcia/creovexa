'use client';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignApi } from '../services/campaign-api.service';
import { GENERATION_POLL_MS, isInProgress } from '../types/generation-job';

// Pide el flyer y sigue su trabajo en segundo plano hasta que termina.
export function useCampaignImage(id: string, enabled: boolean) {
  const client = useQueryClient();
  const queryKey = ['campaign-image', id];
  const status = useQuery({
    queryKey,
    enabled: Boolean(id) && enabled,
    queryFn: ({ signal }) => campaignApi.imageStatus(id, signal),
    retry: false,
    refetchOnMount: 'always',
    refetchInterval: (current) => (isInProgress(current.state.data) ? GENERATION_POLL_MS : false),
  });
  const request = useMutation({
    mutationFn: (generationId: string) => campaignApi.generateImage(id, generationId),
    retry: false,
    onSuccess: (result) => {
      client.setQueryData(queryKey, result);
    },
  });
  const ready = status.data?.status === 'READY';
  // El flyer terminado pasa a ser el contenido candidato de la campaña: recarga la campaña una vez.
  useEffect(() => {
    if (!ready) return;
    void Promise.all([
      client.invalidateQueries({ queryKey: ['stored-campaigns'] }),
      client.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  }, [ready, client]);
  return { status, request };
}

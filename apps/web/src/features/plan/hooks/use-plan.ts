'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { planService } from '../services/plan.service';

export const PLAN_QUERY_KEY = ['plan'];

// El plan y su uso. Solo informa: la API es la que aplica los límites (ADR-0033).
export function usePlan() {
  return useQuery({
    queryKey: PLAN_QUERY_KEY,
    queryFn: ({ signal }) => planService.get(signal),
    retry: false,
    staleTime: 30 * 1000,
  });
}

/** Recarga el uso después de una acción que consume cupo. */
export function useRefreshPlan() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: PLAN_QUERY_KEY });
}

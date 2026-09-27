'use client';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: ({ signal }) => dashboardService.getDashboard(signal),
    retry: false,
    refetchOnMount: 'always',
  });
}

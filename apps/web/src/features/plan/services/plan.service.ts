import { apiRequest } from '@/lib/api-client';
import type { PlanUsage } from '../types/plan.types';

export const planService = {
  async get(signal?: AbortSignal): Promise<PlanUsage> {
    return (await apiRequest<{ data: PlanUsage }>('/plan', { signal })).data;
  },
};

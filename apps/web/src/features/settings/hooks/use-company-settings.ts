'use client';

import { useQuery } from '@tanstack/react-query';

import { companySettingsService } from '../services/company-settings.service';

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],

    queryFn: () => companySettingsService.get(),
  });
}

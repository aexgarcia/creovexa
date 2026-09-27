'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { companySettingsService } from '../services/company-settings.service';

import type { CompanySettings, UpdateCompanySettingsInput } from '../types/company-settings.types';

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation<CompanySettings, Error, UpdateCompanySettingsInput>({
    mutationFn: (input) => companySettingsService.update(input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['company-settings'],
      });
    },
  });
}

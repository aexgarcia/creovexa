'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companySettingsService } from '../services/company-settings.service';
export function useUpdateCompanySettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: companySettingsService.update,
    retry: false,
    onSuccess: (settings) => {
      client.setQueryData(['company-settings'], settings);
    },
  });
}

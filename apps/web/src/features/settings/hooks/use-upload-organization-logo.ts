'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companySettingsService } from '../services/company-settings.service';
export function useUploadOrganizationLogo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: companySettingsService.uploadLogo,
    retry: false,
    onSuccess: (settings) => {
      client.setQueryData(['company-settings'], settings);
    },
  });
}

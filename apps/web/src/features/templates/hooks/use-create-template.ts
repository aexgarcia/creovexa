'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { templateService } from '../services/template.service';

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: templateService.create.bind(templateService),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['templates'],
      });
    },
  });
}

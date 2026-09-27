'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { socialAccountService } from '../services/social-account.service';

import type { SocialAccount } from '../types/social-account.types';

export function useDisconnectSocialAccount() {
  const queryClient = useQueryClient();

  return useMutation<SocialAccount, Error, string>({
    mutationFn: (id) => socialAccountService.disconnect(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['social-accounts'],
      });
    },
  });
}

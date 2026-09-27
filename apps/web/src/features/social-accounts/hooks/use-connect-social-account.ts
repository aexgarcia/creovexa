'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { socialAccountService } from '../services/social-account.service';

import type { ConnectSocialAccountInput, SocialAccount } from '../types/social-account.types';

export function useConnectSocialAccount() {
  const queryClient = useQueryClient();

  return useMutation<SocialAccount, Error, ConnectSocialAccountInput>({
    mutationFn: (input) => socialAccountService.connect(input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['social-accounts'],
      });
    },
  });
}

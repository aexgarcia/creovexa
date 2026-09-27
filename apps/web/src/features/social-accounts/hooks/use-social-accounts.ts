'use client';

import { useQuery } from '@tanstack/react-query';

import { socialAccountService } from '../services/social-account.service';

export function useSocialAccounts() {
  return useQuery({
    queryKey: ['social-accounts'],

    queryFn: () => socialAccountService.findAll(),
  });
}

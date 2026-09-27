'use client';

import { useQuery } from '@tanstack/react-query';

import { publicationService } from '../services/publication.service';

export function usePublications() {
  return useQuery({
    queryKey: ['publications'],

    queryFn: () => publicationService.findAll(),
  });
}

'use client';
import { useMutation } from '@tanstack/react-query';
import type { UpdateTemplateInput } from '../types/template.types';

// Reserved for the visual editor until the API supports revision updates.
export function useUpdateTemplate() {
  return useMutation({
    mutationFn: async (_variables: { id: string; input: UpdateTemplateInput }): Promise<never> => {
      void _variables;
      throw new Error('La edición de plantillas todavía no está disponible.');
    },
  });
}

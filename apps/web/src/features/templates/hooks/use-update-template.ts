'use client';
import { useMutation } from '@tanstack/react-query';
import type { UpdateTemplateInput } from '../types/template.types';

// Reservado para el editor visual hasta que la API permita actualizar revisiones.
export function useUpdateTemplate() {
  return useMutation({
    mutationFn: async (_variables: { id: string; input: UpdateTemplateInput }): Promise<never> => {
      void _variables;
      throw new Error('La edición de plantillas todavía no está disponible.');
    },
  });
}

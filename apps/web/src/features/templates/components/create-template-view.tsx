'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCreateTemplate } from '../hooks/use-create-template';
import type { TemplateDesign } from '../types/template-design';
import { TemplateForm } from './template-form';

export function CreateTemplateView() {
  const router = useRouter();
  const createTemplate = useCreateTemplate();
  const [error, setError] = useState('');
  async function submit(input: { name: string; design: TemplateDesign }) {
    setError('');
    try {
      await createTemplate.mutateAsync(input);
      toast.success('Plantilla creada correctamente');
      router.push('/templates');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la plantilla.');
    }
  }
  return (
    <TemplateForm
      pending={createTemplate.isPending}
      onSubmit={submit}
      error={
        error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {error}
          </p>
        ) : undefined
      }
    />
  );
}

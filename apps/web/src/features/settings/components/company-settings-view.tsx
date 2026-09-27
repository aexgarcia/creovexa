'use client';

import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';

import { Skeleton } from '@/components/ui/skeleton';

import { useCompanySettings } from '../hooks/use-company-settings';

import { useUpdateCompanySettings } from '../hooks/use-update-company-settings';

import type { CompanySettingsFormValues } from '../schemas/company-settings.schema';

import { CompanySettingsForm } from './company-settings-form';

export function CompanySettingsView() {
  const { data: settings, isLoading, isError } = useCompanySettings();

  const updateSettings = useUpdateCompanySettings();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />

        <Skeleton className="h-[650px] w-full" />
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        No se pudo cargar la configuración.
      </div>
    );
  }

  async function handleSubmit(values: CompanySettingsFormValues) {
    try {
      await updateSettings.mutateAsync(values);

      toast.success('Configuración actualizada correctamente');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo actualizar la configuración',
      );
    }
  }

  return (
    <div className="space-y-6">
      <p role="note" className="rounded-lg border bg-muted p-4 text-sm">
        Vista de demostración: los cambios solo se guardan temporalmente y se perderán al recargar.
      </p>
      <PageHeader
        title="Configuración"
        description="Administra la identidad y preferencias de tu empresa."
      />

      <CompanySettingsForm
        defaultValues={{
          businessName: settings.businessName,

          description: settings.description,

          logoUrl: settings.logoUrl ?? '',

          brandTone: settings.brandTone,

          primaryColor: settings.primaryColor,

          defaultCta: settings.defaultCta,
        }}
        onSubmit={handleSubmit}
        isSubmitting={updateSettings.isPending}
      />
    </div>
  );
}

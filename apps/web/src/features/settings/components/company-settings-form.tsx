'use client';

import { Controller, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import { Textarea } from '@/components/ui/textarea';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  companySettingsSchema,
  type CompanySettingsFormValues,
} from '../schemas/company-settings.schema';

interface CompanySettingsFormProps {
  defaultValues: CompanySettingsFormValues;

  onSubmit: (values: CompanySettingsFormValues) => Promise<void>;

  isSubmitting?: boolean;
}

const toneLabels = {
  PROFESSIONAL: 'Profesional',
  FRIENDLY: 'Amigable',
  MODERN: 'Moderno',
  ENERGETIC: 'Enérgico',
  ELEGANT: 'Elegante',
} as const;

export function CompanySettingsForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
}: CompanySettingsFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,

    formState: { errors },
  } = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsSchema),

    defaultValues,
  });

  const logoUrl = watch('logoUrl');

  const primaryColor = watch('primaryColor');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6 rounded-xl border bg-card p-6">
          <div>
            <h2 className="text-lg font-semibold">Información de empresa</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Estos datos podrán utilizarse durante la generación de campañas.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName">Nombre comercial</Label>

            <Input id="businessName" {...register('businessName')} />

            {errors.businessName && (
              <p className="text-sm text-destructive">{errors.businessName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>

            <Textarea id="description" rows={5} {...register('description')} />

            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo</Label>

            <Input id="logoUrl" placeholder="https://..." {...register('logoUrl')} />

            <p className="text-xs text-muted-foreground">
              Por ahora usamos una URL. Luego lo cambiaremos por carga de archivo.
            </p>

            {errors.logoUrl && <p className="text-sm text-destructive">{errors.logoUrl.message}</p>}
          </div>

          <Controller
            control={control}
            name="brandTone"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>Tono de marca</Label>

                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue>{toneLabels[field.value]}</SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="PROFESSIONAL">Profesional</SelectItem>

                    <SelectItem value="FRIENDLY">Amigable</SelectItem>

                    <SelectItem value="MODERN">Moderno</SelectItem>

                    <SelectItem value="ENERGETIC">Enérgico</SelectItem>

                    <SelectItem value="ELEGANT">Elegante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          />

          <div className="space-y-2">
            <Label htmlFor="defaultCta">CTA por defecto</Label>

            <Input id="defaultCta" placeholder="Conoce más" {...register('defaultCta')} />

            {errors.defaultCta && (
              <p className="text-sm text-destructive">{errors.defaultCta.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryColor">Color principal</Label>

            <div className="flex gap-3">
              <Input
                id="primaryColor"
                type="color"
                className="h-10 w-16 p-1"
                {...register('primaryColor')}
              />

              <Input value={primaryColor} readOnly className="font-mono" />
            </div>

            {errors.primaryColor && (
              <p className="text-sm text-destructive">{errors.primaryColor.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Vista previa de marca</h2>

            <div className="mt-6 flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-28 max-w-full object-contain" />
              ) : (
                <p className="text-sm text-muted-foreground">Sin logo configurado</p>
              )}
            </div>

            <div className="mt-5">
              <p className="text-xs text-muted-foreground">Color principal</p>

              <div className="mt-2 flex items-center gap-3">
                <div
                  className="size-10 rounded-lg border"
                  style={{
                    backgroundColor: primaryColor,
                  }}
                />

                <span className="font-mono text-sm">{primaryColor}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Guardar configuración
        </Button>
      </div>
    </form>
  );
}

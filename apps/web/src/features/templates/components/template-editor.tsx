'use client';

import { Controller, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { templateSchema, type TemplateFormValues } from '../schemas/template.schema';
import { TemplatePreview } from './template-preview';

interface TemplateEditorProps {
  defaultValues?: TemplateFormValues;

  isSubmitting?: boolean;

  onSubmit: (values: TemplateFormValues) => Promise<void>;
}

const settingFields = [
  {
    name: 'settings.showLogo',
    label: 'Logo',
  },
  {
    name: 'settings.showHeadline',
    label: 'Título',
  },
  {
    name: 'settings.showRegularPrice',
    label: 'Precio regular',
  },
  {
    name: 'settings.showPromotionPrice',
    label: 'Precio promocional',
  },
  {
    name: 'settings.showCta',
    label: 'CTA',
  },
  {
    name: 'settings.showMainImage',
    label: 'Imagen principal',
  },
] as const;

export function TemplateEditor({
  defaultValues,
  isSubmitting = false,
  onSubmit,
}: TemplateEditorProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,

    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),

    defaultValues: defaultValues ?? {
      name: '',
      description: '',
      format: 'SQUARE',
      isActive: true,

      settings: {
        showLogo: true,
        showRegularPrice: true,
        showPromotionPrice: true,
        showHeadline: true,
        showCta: true,
        showMainImage: true,
      },
    },
  });

  const values = watch();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 xl:grid-cols-[420px_1fr]">
      <div className="space-y-6 rounded-xl border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Configuración</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Configura la estructura general de la plantilla.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>

          <Input id="name" {...register('name')} />

          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>

          <Textarea id="description" rows={4} {...register('description')} />

          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        <Controller
          control={control}
          name="format"
          render={({ field }) => (
            <div className="space-y-2">
              <Label>Formato</Label>

              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue>
                    {field.value === 'SQUARE' && '1080 × 1080'}

                    {field.value === 'PORTRAIT' && '1080 × 1350'}

                    {field.value === 'STORY' && '1080 × 1920'}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="SQUARE">1080 × 1080</SelectItem>

                  <SelectItem value="PORTRAIT">1080 × 1350</SelectItem>

                  <SelectItem value="STORY">1080 × 1920</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <div className="space-y-3">
          <p className="text-sm font-medium">Elementos visibles</p>

          {settingFields.map((setting) => (
            <Controller
              key={setting.name}
              name={setting.name}
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <Label htmlFor={setting.name}>{setting.label}</Label>

                  <Switch
                    id={setting.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          ))}
        </div>

        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Plantilla activa</p>

                <p className="text-xs text-muted-foreground">Disponible para campañas</p>
              </div>

              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Guardar plantilla
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Vista previa</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Los cambios se reflejan automáticamente.
          </p>
        </div>

        <TemplatePreview
          template={{
            id: 'preview',
            name: values.name || 'Plantilla',
            description: values.description || '',
            format: values.format,
            width: 1080,
            height: values.format === 'SQUARE' ? 1080 : values.format === 'PORTRAIT' ? 1350 : 1920,
            thumbnailUrl: null,
            isActive: values.isActive,
            settings: values.settings,
            createdAt: '',
            updatedAt: '',
          }}
        />
      </div>
    </form>
  );
}

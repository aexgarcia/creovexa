'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  companySettingsService,
  type LogoVariant,
  type OrganizationSettings,
} from '../services/company-settings.service';

const COPY: Record<LogoVariant, { label: string; help: string }> = {
  'dark-background': {
    label: 'Logo para fondos oscuros (opcional)',
    help: 'Una versión clara de tu logo. Se usa en flyers oscuros en lugar de ponerle un velo.',
  },
  icon: {
    label: 'Isotipo (opcional)',
    help: 'Solo el símbolo, sin texto, para espacios pequeños.',
  },
};

/** Se sube o se quita al momento, sin esperar a "Guardar cambios". */
export function LogoVariantField({
  variant,
  settings,
}: {
  variant: LogoVariant;
  settings: OrganizationSettings;
}) {
  const client = useQueryClient();
  const [error, setError] = useState('');
  const url = variant === 'icon' ? settings.iconUrl : settings.darkBackgroundLogoUrl;
  const save = (saved: OrganizationSettings) => client.setQueryData(['company-settings'], saved);
  const fail = (cause: unknown) =>
    setError(cause instanceof ApiError ? cause.message : 'No se pudo guardar. Inténtalo de nuevo.');
  const upload = useMutation({
    mutationFn: (file: File) => companySettingsService.uploadLogoVariant(variant, file),
    retry: false,
    onSuccess: save,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => companySettingsService.removeLogoVariant(variant),
    retry: false,
    onSuccess: save,
    onError: fail,
  });
  const busy = upload.isPending || remove.isPending;
  return (
    <div className="space-y-2">
      <Label htmlFor={`logo-${variant}`}>{COPY[variant].label}</Label>
      <div className="flex items-center gap-3">
        {url && (
          <div
            className={`flex h-12 w-20 items-center justify-center rounded border p-1 ${
              variant === 'dark-background' ? 'bg-slate-900' : 'bg-muted/20'
            }`}
          >
            <Image
              src={url}
              alt=""
              width={80}
              height={48}
              unoptimized
              className="h-full w-full object-contain"
            />
          </div>
        )}
        <Input
          id={`logo-${variant}`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            setError('');
            if (!file) return;
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size)
              return setError('Selecciona un PNG, JPEG o WebP válido.');
            if (file.size > 10 * 1024 * 1024)
              return setError('La imagen supera el máximo de 10 MB.');
            upload.mutate(file);
          }}
        />
        {url && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => remove.mutate()}>
            Quitar
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{busy ? 'Guardando…' : COPY[variant].help}</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiUrl } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { templateService } from '../services/template.service';
import type { StoredTemplate } from '../types/stored-template.types';

const MAX = 2;

/**
 * Hasta 2 flyers de ejemplo. La IA los usa solo como estilo, nunca copia sus textos ni sus
 * productos. Subir o quitar uno crea una revisión nueva al momento.
 */
export function StyleReferencesField({
  template,
  disabled = false,
  onPendingChange,
}: {
  template: StoredTemplate;
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
}) {
  const client = useQueryClient();
  const [error, setError] = useState('');
  const revision = template.currentRevision;
  const ids = revision.design.styleReferenceAssetIds;
  const refresh = async (updated: StoredTemplate) => {
    client.setQueryData(['templates', updated.id], updated);
    await client.invalidateQueries({ queryKey: ['templates'] });
  };
  const fail = (cause: unknown) =>
    setError(cause instanceof ApiError ? cause.message : 'No se pudo guardar. Inténtalo de nuevo.');
  const add = useMutation({
    mutationFn: (file: File) => templateService.addStyleReference(template.id, revision.id, file),
    retry: false,
    onMutate: () => onPendingChange?.(true),
    onSettled: () => onPendingChange?.(false),
    onSuccess: refresh,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (assetId: string) =>
      templateService.removeStyleReference(template.id, revision.id, assetId),
    retry: false,
    onMutate: () => onPendingChange?.(true),
    onSettled: () => onPendingChange?.(false),
    onSuccess: refresh,
    onError: fail,
  });
  const busy = add.isPending || remove.isPending;
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="font-semibold">Referencias de estilo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hasta {MAX} flyers que te gusten. La IA toma su estilo; nunca copia sus textos ni sus
          productos.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Subir o quitar una referencia guarda una nueva revisión al momento.
      </p>
      {disabled && !busy && (
        <p className="text-xs text-[#7fa0ff]">
          Guarda los cambios de la plantilla antes de modificar sus referencias.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {ids.map((assetId) => (
          <div key={assetId} className="space-y-2">
            <Image
              src={apiUrl(`/templates/${template.id}/style-references/${assetId}`)}
              alt="Referencia de estilo"
              width={120}
              height={120}
              unoptimized
              className="size-28 rounded-lg border object-cover"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || disabled}
              onClick={() => remove.mutate(assetId)}
            >
              Quitar
            </Button>
          </div>
        ))}
      </div>
      {ids.length < MAX && (
        <div className="space-y-2">
          <Label htmlFor="style-reference">Agregar referencia</Label>
          <Input
            id="style-reference"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy || disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              setError('');
              if (!file) return;
              if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size)
                return setError('Selecciona un PNG, JPEG o WebP válido.');
              if (file.size > 10 * 1024 * 1024)
                return setError('La imagen supera el máximo de 10 MB.');
              add.mutate(file);
            }}
          />
        </div>
      )}
      {busy && <p role="status">Guardando…</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

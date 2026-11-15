'use client';
import { useState, type FormEvent } from 'react';
import { Loader2, Pencil, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { useCampaignCopy } from '../hooks/use-campaign-copy';
import { failureMessage, isInProgress } from '../types/generation-job';
import {
  HEADLINE_MAX_LENGTH,
  SUBHEADLINE_MAX_LENGTH,
  type CampaignCopy,
} from '../services/campaign-copy.service';

type CopyHook = ReturnType<typeof useCampaignCopy>;

export function CampaignCopyCard({
  query,
  updateTexts,
  editable,
}: {
  query: CopyHook['query'];
  updateTexts: CopyHook['updateTexts'];
  // Solo antes de pedir el flyer: después, cambiar el texto costaría otra imagen.
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const job = query.data;
  const copy = job?.copy ?? null;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Texto de campaña
          </CardTitle>
          {copy && <Badge variant="secondary">Texto preparado</Badge>}
        </div>
        <CardDescription>
          Prepara el mensaje usando los datos guardados de tu producto y promoción.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {query.isLoading && <p role="status">Cargando texto…</p>}
        {query.error && (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-destructive">{query.error.message}</p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Reintentar consulta
            </Button>
          </div>
        )}
        {!query.isLoading && !query.error && !job && (
          <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
            <Sparkles className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Todavía no hay texto para esta generación.
            </p>
          </div>
        )}
        {!query.error && isInProgress(job) && (
          <div
            role="status"
            className="flex items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground"
          >
            <Loader2 className="size-5 animate-spin text-primary" />
            {job?.status === 'RUNNING'
              ? 'Escribiendo el texto de tu campaña…'
              : 'Solicitud recibida. El texto empezará a prepararse en un momento…'}
          </div>
        )}
        {!query.error && job?.status === 'FAILED' && (
          <p role="alert" className="text-sm text-destructive">
            {failureMessage(job)}
          </p>
        )}
        {copy && !query.error && (
          <div className="space-y-4 rounded-xl bg-muted/20 p-5">
            {editing && editable && job ? (
              <FlyerTextsForm
                copy={copy}
                onCancel={() => {
                  updateTexts.reset();
                  setEditing(false);
                }}
                onSave={async (texts) => {
                  await updateTexts.mutateAsync({ generationId: job.generationId, ...texts });
                  setEditing(false);
                }}
                saving={updateTexts.isPending}
                error={updateTexts.error}
              />
            ) : (
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs text-muted-foreground">Textos del flyer</p>
                    <h3 className="break-words text-lg font-semibold">{copy.headline}</h3>
                    {copy.subheadline && (
                      <p className="break-words text-sm text-muted-foreground">
                        {copy.subheadline}
                      </p>
                    )}
                  </div>
                  {editable && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      <Pencil className="size-4" />
                      Corregir
                    </Button>
                  )}
                </div>
              </div>
            )}
            <p className="border-t pt-3 text-xs text-muted-foreground">Publicación</p>
            <p className="whitespace-pre-wrap break-words text-sm">{copy.caption}</p>
            <p className="break-words font-medium text-primary">{copy.cta}</p>
            <p className="text-sm text-muted-foreground">{copy.hashtags.join(' ')}</p>
            <p className="border-t pt-3 text-xs text-muted-foreground">
              {editable
                ? 'Revisa el titular y el subtítulo antes de generar el flyer: corregirlos ahora no tiene costo.'
                : 'El texto está preparado. Genera el flyer para revisar la publicidad completa antes de aprobarla.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FlyerTextsForm({
  copy,
  onSave,
  onCancel,
  saving,
  error,
}: {
  copy: CampaignCopy;
  onSave: (texts: { headline: string; subheadline: string | null }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: Error | null;
}) {
  const [headline, setHeadline] = useState(copy.headline);
  const [subheadline, setSubheadline] = useState(copy.subheadline ?? '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    // El error queda en la mutación y se muestra abajo.
    onSave({ headline, subheadline: subheadline.trim() ? subheadline : null }).catch(() => {});
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="flyer-headline">Titular</Label>
        <Input
          id="flyer-headline"
          value={headline}
          maxLength={HEADLINE_MAX_LENGTH}
          required
          onChange={(event) => setHeadline(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {headline.length}/{HEADLINE_MAX_LENGTH}. Sin precios, porcentajes ni fechas: el flyer los
          muestra aparte.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="flyer-subheadline">Subtítulo (opcional)</Label>
        <Input
          id="flyer-subheadline"
          value={subheadline}
          maxLength={SUBHEADLINE_MAX_LENGTH}
          onChange={(event) => setSubheadline(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {subheadline.length}/{SUBHEADLINE_MAX_LENGTH}. La plantilla decide si se muestra.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Guardar textos
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

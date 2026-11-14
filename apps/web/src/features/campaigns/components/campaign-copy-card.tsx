'use client';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { useCampaignCopy } from '../hooks/use-campaign-copy';
import { failureMessage, isInProgress } from '../types/generation-job';
export function CampaignCopyCard({
  query,
}: {
  query: ReturnType<typeof useCampaignCopy>['query'];
}) {
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
            <h3 className="break-words text-lg font-semibold">{copy.headline}</h3>
            <p className="whitespace-pre-wrap break-words text-sm">{copy.caption}</p>
            <p className="break-words font-medium text-primary">{copy.cta}</p>
            <p className="text-sm text-muted-foreground">{copy.hashtags.join(' ')}</p>
            <p className="border-t pt-3 text-xs text-muted-foreground">
              El texto está preparado. Genera el flyer para revisar la publicidad completa antes de
              aprobarla.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

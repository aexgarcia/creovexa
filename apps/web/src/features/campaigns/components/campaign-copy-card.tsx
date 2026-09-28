'use client';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCampaignCopy } from '../hooks/use-campaign-copy';
import type { StoredCampaign } from '../types/stored-campaign.types';
export function CampaignCopyCard({ campaign }: { campaign: StoredCampaign }) {
  const { query, generate } = useCampaignCopy(campaign.id, campaign.version);
  const eligible = ['DRAFT', 'GENERATING'].includes(campaign.status);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Texto de campaña
          </CardTitle>
          {query.data && <Badge variant="secondary">Texto preparado</Badge>}
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
        {!query.isLoading && !query.error && !query.data && (
          <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
            <Sparkles className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Todavía no hay texto para esta generación.
            </p>
          </div>
        )}
        {query.data && !query.error && (
          <div className="space-y-4 rounded-xl bg-muted/20 p-5">
            <h3 className="break-words text-lg font-semibold">{query.data.headline}</h3>
            <p className="whitespace-pre-wrap break-words text-sm">{query.data.caption}</p>
            <p className="break-words font-medium text-primary">{query.data.cta}</p>
            <p className="text-sm text-muted-foreground">{query.data.hashtags.join(' ')}</p>
            <p className="border-t pt-3 text-xs text-muted-foreground">
              La imagen y la pieza final se incorporarán en el siguiente módulo. Este texto todavía
              no se puede aprobar ni publicar.
            </p>
          </div>
        )}
        {generate.error && (
          <div role="alert" className="space-y-2 text-sm">
            <p className="text-destructive">{generate.error.message}</p>
            <p className="text-muted-foreground">
              Si otra solicitud está en curso, espera y actualiza la consulta.
            </p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Actualizar consulta
            </Button>
          </div>
        )}
        {eligible && !query.data && (
          <Button
            disabled={generate.isPending || query.isLoading || Boolean(query.error)}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 size-4" />
            )}
            {generate.isPending ? 'Preparando texto…' : 'Generar texto'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

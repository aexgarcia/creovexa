'use client';
import { History, Loader2, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCampaignVersions, useRestoreCampaignVersion } from '../hooks/use-campaign-versions';
import type { CampaignVersion } from '../types/stored-campaign.types';
import { CampaignImage } from './campaign-image';
import { failureMessage } from '../types/generation-job';

function price({ amountMinor, currency }: { amountMinor: number; currency: string }) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(amountMinor / 100);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

// Los precios congelados en la versión; si difieren de los de la vigente, conviene revisarlos.
function prices(version: CampaignVersion) {
  const { regular, promotion } = version.prices;
  return promotion ? `${price(promotion)} (antes ${price(regular)})` : price(regular);
}

// Historial de versiones del flyer (ADR-0026). Permite volver a una anterior que tenga flyer.
export function CampaignVersions({
  campaignId,
  campaignVersion,
  canRestore,
}: {
  campaignId: string;
  // La versión de la campaña que se está viendo, para no pisar un cambio de otra pestaña.
  campaignVersion: number;
  // La campaña admite cambiar de versión (no está publicándose ni publicada).
  canRestore: boolean;
}) {
  const versions = useCampaignVersions(campaignId, campaignVersion);
  const restore = useRestoreCampaignVersion(campaignId);
  const list = versions.data ?? [];
  if (!versions.isLoading && !versions.error && list.length < 2) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5 text-primary" /> Versiones del flyer
        </CardTitle>
        <CardDescription>
          Cada regeneración crea una versión nueva. Puedes volver a una anterior: quedará pendiente
          de aprobación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {versions.isLoading && <p role="status">Cargando versiones…</p>}
        {versions.error && (
          <p role="alert" className="text-sm text-destructive">
            {versions.error.message}
          </p>
        )}
        {restore.error && (
          <p role="alert" className="text-sm text-destructive">
            {restore.error.message}
          </p>
        )}
        <ul className="space-y-3">
          {list.map((version) => (
            <li
              key={version.generationId}
              className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center"
            >
              <CampaignImage
                variant="thumbnail"
                url={version.content?.finalAssetUrl ?? null}
                alt={`Flyer de la versión ${version.number}`}
                emptyLabel="Sin flyer"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Versión {version.number}</span>
                  {version.current && <Badge variant="secondary">Vigente</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {dateTime(version.requestedAt)}
                  </span>
                </div>
                {version.content ? (
                  <p className="break-words text-sm">{version.content.headline}</p>
                ) : version.failure ? (
                  <p className="text-sm text-destructive">
                    {failureMessage({
                      generationId: version.generationId,
                      status: 'FAILED',
                      failureCode: version.failure,
                    })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin flyer todavía.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Precio en esta versión: {prices(version)}
                </p>
              </div>
              {canRestore && !version.current && version.content && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restore.isPending}
                  onClick={() =>
                    restore.mutate({
                      generationId: version.generationId,
                      expectedVersion: campaignVersion,
                    })
                  }
                >
                  {restore.isPending && restore.variables?.generationId === version.generationId ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="size-4" />
                  )}
                  Usar esta versión
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

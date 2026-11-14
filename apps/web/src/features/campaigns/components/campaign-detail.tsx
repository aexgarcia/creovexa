'use client';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ImageIcon,
  LayoutGrid,
  Loader2,
  RotateCcw,
  Megaphone,
  Package,
  Send,
  Sparkles,
} from 'lucide-react';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProduct } from '@/features/products/hooks/use-product';
import { useTemplate } from '@/features/templates/hooks/use-template';
import { useStoredCampaign, useApproveStoredCampaign } from '../hooks/use-stored-campaigns';
import { campaignStatusLabels } from '../types/stored-campaign.types';
import { useCampaignCopy } from '../hooks/use-campaign-copy';
import { CampaignCopyCard } from './campaign-copy-card';
import { CampaignPublications } from './campaign-publications';
import { CampaignImage } from './campaign-image';
import { useCampaignImage } from '../hooks/use-campaign-image';
import { failureMessage, isInProgress } from '../types/generation-job';

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const { data: campaign, isLoading, error, refetch, isFetching } = useStoredCampaign(campaignId);
  const product = useProduct(campaign?.productId ?? '');
  const template = useTemplate(campaign?.templateId ?? '');
  const approve = useApproveStoredCampaign(campaignId);
  const flyer = useCampaignImage(campaignId, Boolean(campaign && !campaign.candidateContent));
  const flyerRequesting = useRef(false);
  const [loadedFlyer, setLoadedFlyer] = useState<string | null>(null);
  const [failedFlyer, setFailedFlyer] = useState<string | null>(null);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const { query: copy, generate } = useCampaignCopy(
    campaign && !campaign.candidateContent ? campaign.id : '',
    campaign?.version ?? 0,
  );
  const [approvedMessage, setApprovedMessage] = useState('');
  if (isLoading)
    return (
      <div role="status" className="space-y-6">
        <span className="sr-only">Cargando campaña…</span>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  if (error || !campaign)
    return (
      <div role="alert" className="space-y-4 rounded-xl border bg-card p-8">
        <p>{error?.message ?? 'Campaña no encontrada.'}</p>
        <Button onClick={() => void refetch()}>Reintentar</Button>
        <Button variant="ghost" nativeButton={false} render={<Link href="/campaigns" />}>
          Volver a campañas
        </Button>
      </div>
    );
  const content = campaign.candidateContent;
  const finalAssetUrl = content?.finalAssetUrl;
  const previewKey = content && finalAssetUrl ? `${content.id}:${finalAssetUrl}` : null;
  const canReview = Boolean(previewKey && loadedFlyer === previewKey && failedFlyer !== previewKey);
  const isApproved = Boolean(content && campaign.approvedContentId === content.id);
  // Generation runs in the background; these follow its jobs instead of a pending request.
  const copyJob = copy.data;
  const copyReady = copyJob?.status === 'READY' ? copyJob : null;
  const copyBusy = generate.isPending || isInProgress(copyJob);
  const flyerJob = flyer.status.data;
  const flyerBusy = flyer.request.isPending || isInProgress(flyerJob);
  async function handleApprove() {
    if (!content || !canReview || approve.isPending) return;
    setApprovedMessage('');
    try {
      await approve.mutateAsync(content.id);
      setApprovedMessage('Revisión aprobada correctamente.');
    } catch {
      // The mutation exposes a safe error below.
    }
  }
  async function handleGenerateFlyer() {
    if (!copyReady || content || flyerRequesting.current || flyerBusy) return;
    flyerRequesting.current = true;
    try {
      await flyer.request.mutateAsync(copyReady.generationId);
    } catch {
      /* Safe error displayed below. */
    } finally {
      flyerRequesting.current = false;
    }
  }
  return (
    <div className="space-y-6">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Todas las campañas
      </Link>
      <header className="flex flex-col gap-5 rounded-xl border bg-card p-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Megaphone className="size-6" />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={campaign.status === 'FAILED' ? 'destructive' : 'secondary'}>
                {campaignStatusLabels[campaign.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Creada el {dateLabel(campaign.createdAt)}
              </span>
            </div>
            <h1 className="break-words text-2xl font-semibold tracking-tight">{campaign.title}</h1>
          </div>
        </div>
        {isApproved && (
          <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="size-4" /> Contenido aprobado
          </span>
        )}
        <div className="flex flex-col gap-2 xl:ml-auto xl:max-w-lg xl:items-end">
          <div
            role="group"
            aria-label="Acciones de campaña"
            className="flex flex-wrap items-center gap-2 xl:justify-end"
          >
            {!content && ['DRAFT', 'GENERATING'].includes(campaign.status) && !copyReady && (
              <Button
                disabled={copyBusy || copy.isPending || Boolean(copy.error) || isFetching}
                onClick={() => generate.mutate()}
              >
                {copyBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {copyBusy
                  ? 'Preparando texto…'
                  : copyJob?.status === 'FAILED'
                    ? 'Reintentar texto'
                    : 'Generar texto'}
              </Button>
            )}
            {!content && copyReady && campaign.status === 'GENERATING' && (
              <Button
                disabled={flyerBusy || isFetching || Boolean(copy.error)}
                onClick={() => void handleGenerateFlyer()}
              >
                {flyerBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImageIcon className="size-4" />
                )}
                {flyerBusy
                  ? 'Generando flyer…'
                  : flyerJob?.status === 'FAILED'
                    ? 'Reintentar flyer'
                    : 'Generar flyer'}
              </Button>
            )}
            {campaign.status === 'PENDING_APPROVAL' && (
              <Button
                disabled={!content || !canReview || approve.isPending || isFetching}
                onClick={() => void handleApprove()}
              >
                <CheckCircle2 className="size-4" />
                {approve.isPending ? 'Aprobando…' : 'Aprobar esta revisión'}
              </Button>
            )}
            <Button variant="outline" disabled aria-describedby="campaign-pending-actions">
              <RotateCcw className="size-4" /> Regenerar
            </Button>
            <Button variant="outline" disabled aria-describedby="campaign-pending-actions">
              <Send className="size-4" /> Publicar
            </Button>
          </div>
          <p id="campaign-pending-actions" className="text-xs text-muted-foreground">
            Regenerar y publicar: próximamente.
          </p>
          {campaign.status === 'PENDING_APPROVAL' && (
            <p className="text-xs text-muted-foreground">
              {finalAssetUrl
                ? canReview
                  ? 'Aprobar confirma el flyer mostrado; la publicación se realiza después.'
                  : 'Carga la vista previa del flyer antes de aprobar esta revisión.'
                : 'La aprobación estará disponible cuando puedas previsualizar el flyer final.'}
            </p>
          )}
          {!content && flyerBusy && (
            <p role="status" className="text-sm text-muted-foreground">
              Creando la publicidad con la imagen y los datos de tu producto. Puede tardar unos
              minutos; puedes salir de esta página y volver después.
            </p>
          )}
          {!content && !flyerBusy && flyerJob?.status === 'FAILED' && (
            <p role="alert" className="text-sm text-destructive">
              {failureMessage(flyerJob)}
            </p>
          )}
          {flyer.request.error && (
            <div role="alert" className="space-y-2">
              <p className="text-sm text-destructive">{flyer.request.error.message}</p>
              <Button
                variant="outline"
                onClick={() => {
                  flyer.request.reset();
                  void refetch();
                }}
              >
                Actualizar campaña
              </Button>
            </div>
          )}
          {generate.error && (
            <div role="alert" className="space-y-2">
              <p className="text-sm text-destructive">{generate.error.message}</p>
              <Button variant="outline" onClick={() => void copy.refetch()}>
                Actualizar consulta
              </Button>
            </div>
          )}
          {approve.error && (
            <div role="alert" className="space-y-3">
              <p className="text-sm text-destructive">{approve.error.message}</p>
              <Button
                variant="outline"
                onClick={() => {
                  approve.reset();
                  void refetch();
                }}
              >
                Actualizar campaña
              </Button>
            </div>
          )}
          {approvedMessage && (
            <p role="status" className="text-sm text-primary">
              {approvedMessage}
            </p>
          )}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="size-5 text-primary" /> Vista previa
                </CardTitle>
                {content && <Badge variant="outline">Revisión {content.revision}</Badge>}
              </div>
              <CardDescription>La pieza y el mensaje que acompañarán tu campaña.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <CampaignImage
                key={`${previewKey ?? 'empty'}:${previewAttempt}`}
                url={finalAssetUrl}
                alt={`Flyer final de ${campaign.title}`}
                emptyLabel={
                  flyerBusy
                    ? 'Generando el flyer final de tu campaña…'
                    : 'El flyer final aparecerá aquí cuando se complete la composición de la campaña.'
                }
                onLoad={() => {
                  setLoadedFlyer(previewKey);
                  setFailedFlyer(null);
                }}
                onError={() => {
                  setLoadedFlyer(null);
                  setFailedFlyer(previewKey);
                }}
              />
              {previewKey && failedFlyer === previewKey && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setLoadedFlyer(null);
                    setFailedFlyer(null);
                    setPreviewAttempt((value) => value + 1);
                  }}
                >
                  Reintentar vista previa
                </Button>
              )}
              {content && (
                <div className="space-y-4 rounded-xl border bg-background p-5">
                  <h2 className="break-words text-xl font-semibold">{content.headline}</h2>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                    {content.caption}
                  </p>
                  <p className="break-words text-sm text-primary">{content.hashtags.join(' ')}</p>
                  <div className="break-words rounded-lg bg-primary/10 px-4 py-3 text-center text-sm font-semibold text-primary">
                    {content.cta}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {!content && <CampaignCopyCard query={copy} />}
          <div className="rounded-xl border bg-card p-6">
            <CampaignPublications key={campaign.id} campaignId={campaign.id} />
          </div>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la campaña</CardTitle>
              <CardDescription>Los elementos de tu promoción.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Imagen del producto o servicio</p>
                <CampaignImage
                  url={
                    campaign.productImageUrl !== undefined
                      ? campaign.productImageUrl
                      : product.data?.imageUrl
                  }
                  alt={product.data?.name ?? 'Producto o servicio de la campaña'}
                  emptyLabel={
                    product.data?.imageAssetIds.length
                      ? 'La imagen guardada aún no está disponible para visualizar.'
                      : 'Este producto o servicio todavía no tiene una imagen guardada.'
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Se usará automáticamente para componer la publicidad.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Producto o servicio</p>
                  <p className="mt-1 break-words text-sm font-medium">
                    {product.data?.name ??
                      (product.isLoading ? 'Cargando producto…' : 'Producto no disponible')}
                  </p>
                  {product.error && (
                    <Button size="sm" variant="ghost" onClick={() => void product.refetch()}>
                      Reintentar
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <LayoutGrid className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Plantilla</p>
                  <p className="mt-1 break-words text-sm font-medium">
                    {template.data?.name ??
                      (template.isLoading ? 'Cargando plantilla…' : 'Plantilla no disponible')}
                  </p>
                  {template.data && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {template.data.currentRevision.id === campaign.templateRevisionId
                        ? 'Revisión ' +
                          template.data.currentRevision.number +
                          ' · ' +
                          template.data.currentRevision.dimensions.width +
                          ' × ' +
                          template.data.currentRevision.dimensions.height +
                          ' px'
                        : 'Revisión guardada al crear la campaña'}
                    </p>
                  )}
                  {template.error && (
                    <Button size="sm" variant="ghost" onClick={() => void template.refetch()}>
                      Reintentar
                    </Button>
                  )}
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">Llamada a la acción</p>
                <p className="mt-2 break-words text-sm font-medium">{campaign.cta}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Instrucciones adicionales</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {campaign.instructions || 'Sin instrucciones adicionales.'}
                </p>
              </div>
            </CardContent>
          </Card>
          {campaign.promotion && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" /> Promoción
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-3xl font-semibold tracking-tight">
                  {new Intl.NumberFormat('es-PE', {
                    style: 'currency',
                    currency: campaign.promotion.currency,
                  }).format(campaign.promotion.amountMinor / 100)}
                </p>
                <div className="flex items-start gap-2 border-t border-primary/10 pt-4 text-xs leading-relaxed text-muted-foreground">
                  <CalendarDays className="size-4 shrink-0" />
                  <div>
                    <p>
                      Desde:{' '}
                      {campaign.promotion.startsAt
                        ? new Date(campaign.promotion.startsAt).toLocaleString('es-PE')
                        : 'Sin fecha de inicio'}
                    </p>
                    <p>
                      Hasta:{' '}
                      {campaign.promotion.endsAt
                        ? new Date(campaign.promotion.endsAt).toLocaleString('es-PE')
                        : 'Sin fecha de fin'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="space-y-3 rounded-xl border border-dashed p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Send className="size-4 text-muted-foreground" /> Publicación en redes
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              La publicación en redes se incorporará en las siguientes fases. Puedes generar y
              aprobar el flyer antes de publicarlo.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

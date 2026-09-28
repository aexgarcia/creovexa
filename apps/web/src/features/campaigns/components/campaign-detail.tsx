'use client';
import { CampaignCopyCard } from './campaign-copy-card';
import { ImageIcon, Send, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { useStoredCampaign, useApproveStoredCampaign } from '../hooks/use-stored-campaigns';
import { campaignStatusLabels } from '../types/stored-campaign.types';
import { CampaignPublications } from './campaign-publications';
export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const { data: campaign, isLoading, error, refetch, isFetching } = useStoredCampaign(campaignId);
  const approve = useApproveStoredCampaign(campaignId);
  const [approvedMessage, setApprovedMessage] = useState('');
  if (isLoading) return <p role="status">Cargando campaña…</p>;
  if (error || !campaign)
    return (
      <div role="alert">
        <p>{error?.message ?? 'Campaña no encontrada.'}</p>
        <Button onClick={() => void refetch()}>Reintentar</Button>
      </div>
    );
  const content = campaign.candidateContent;
  async function handleApprove() {
    if (!content || approve.isPending) return;
    setApprovedMessage('');
    try {
      await approve.mutateAsync(content.id);
      setApprovedMessage('Revisión aprobada correctamente.');
    } catch {
      /* The mutation exposes a safe error below. */
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader title={campaign.title} description={campaignStatusLabels[campaign.status]} />
      <Button variant="outline" nativeButton={false} render={<Link href="/campaigns" />}>
        Volver a campañas
      </Button>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-5 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Información de campaña</h2>
          <Badge variant="secondary">{campaignStatusLabels[campaign.status]}</Badge>
          <p>
            <strong>CTA:</strong> {campaign.cta}
          </p>
          <p className="whitespace-pre-wrap">{campaign.instructions}</p>
          <p className="break-all">Producto: {campaign.productId}</p>
          <p className="break-all">Revisión de plantilla: {campaign.templateRevisionId}</p>
          {campaign.promotion && (
            <>
              <p>
                Promoción:{' '}
                {new Intl.NumberFormat('es-PE', {
                  style: 'currency',
                  currency: campaign.promotion.currency,
                }).format(campaign.promotion.amountMinor / 100)}
              </p>
              <p>
                Inicio:{' '}
                {campaign.promotion.startsAt
                  ? new Date(campaign.promotion.startsAt).toLocaleString('es-PE')
                  : 'Sin fecha'}{' '}
                · Fin:{' '}
                {campaign.promotion.endsAt
                  ? new Date(campaign.promotion.endsAt).toLocaleString('es-PE')
                  : 'Sin fecha'}
              </p>
            </>
          )}
        </section>
        <aside className="row-span-2 space-y-5 rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Vista previa de campaña</h2>
          <div className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
            <ImageIcon className="size-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              {content?.assetIds.length
                ? 'La vista de imágenes estará disponible al conectar el almacenamiento.'
                : 'Aquí aparecerá la imagen de tu campaña.'}
            </p>
          </div>
          <p className="break-words text-lg font-semibold">{content?.headline || campaign.title}</p>
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {content?.caption || campaign.instructions}
          </p>
          <div className="rounded-lg bg-primary/10 p-3 text-center text-sm font-semibold text-primary">
            {content?.cta || campaign.cta}
          </div>
        </aside>
        <section className="space-y-5 rounded-xl border bg-card p-6">
          <h2 className="text-xl font-semibold">Contenido candidato</h2>
          {content ? (
            <>
              <p>Revisión {content.revision}</p>
              <h3 className="font-semibold">{content.headline}</h3>
              <p className="whitespace-pre-wrap">{content.caption}</p>
              <p>{content.cta}</p>
              <p>{content.hashtags.join(' ')}</p>
              <p className="text-sm text-muted-foreground">
                La vista de imágenes estará disponible al conectar el almacenamiento.
              </p>
              <ul className="break-all text-sm">
                {content.assetIds.map((id) => (
                  <li key={id}>Asset: {id}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>Todavía no hay contenido candidato.</p>
          )}
          {campaign.status === 'PENDING_APPROVAL' && (
            <>
              <p className="text-sm">
                Al aprobar se confirma la revisión mostrada. La publicación es una operación
                posterior.
              </p>
              <Button
                disabled={!content || approve.isPending || isFetching}
                onClick={() => void handleApprove()}
              >
                {approve.isPending ? 'Aprobando…' : 'Aprobar esta revisión'}
              </Button>
            </>
          )}
          {approve.error && (
            <div role="alert">
              <p>{approve.error.message}</p>
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
          {approvedMessage && <p role="status">{approvedMessage}</p>}
          {campaign.approvedContentId && (
            <p className="break-all">Contenido aprobado: {campaign.approvedContentId}</p>
          )}
        </section>
      </div>
      <p className="text-sm text-muted-foreground">
        Edición, generación de imagen, regeneración y envío a redes próximamente.
      </p>
      <div className="flex flex-wrap gap-3" aria-label="Funciones pendientes de integración">
        <Button disabled variant="outline">
          <RotateCcw className="mr-2 size-4" />
          Regenerar contenido
        </Button>
        <Button disabled variant="outline">
          <Send className="mr-2 size-4" />
          Publicar en redes
        </Button>
      </div>
      <CampaignCopyCard campaign={campaign} />
      <CampaignPublications key={campaign.id} campaignId={campaign.id} />
    </div>
  );
}

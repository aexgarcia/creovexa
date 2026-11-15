'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStoredCampaign, useUpdateStoredCampaign } from '../hooks/use-stored-campaigns';
import { campaignDraft } from '../schemas/stored-campaign-input';
import { CampaignBriefForm } from './campaign-brief-form';

// Solo un borrador se edita: después de generar, los cambios requieren otra generación.
export function EditCampaignView({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const { data: campaign, isLoading, error, refetch } = useStoredCampaign(campaignId);
  const update = useUpdateStoredCampaign(campaignId);
  if (isLoading)
    return (
      <div role="status">
        <span className="sr-only">Cargando campaña…</span>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  if (error || !campaign)
    return (
      <div role="alert" className="space-y-4 rounded-xl border bg-card p-8">
        <p>{error?.message ?? 'Campaña no encontrada.'}</p>
        <Button onClick={() => void refetch()}>Reintentar</Button>
      </div>
    );
  if (campaign.status !== 'DRAFT')
    return (
      <div className="space-y-4 rounded-xl border bg-card p-8">
        <p>Solo se puede editar una campaña en borrador.</p>
        <Button nativeButton={false} render={<Link href={`/campaigns/${campaignId}`} />}>
          Ver la campaña
        </Button>
      </div>
    );
  return (
    <div className="space-y-6">
      <PageHeader title="Editar campaña" description={campaign.title} />
      <CampaignBriefForm
        // La versión en la clave reinicia el formulario si la campaña cambia en otro lado.
        key={campaign.version}
        initialDraft={campaignDraft(campaign)}
        initialProductId={campaign.productId}
        initialTemplateId={campaign.templateId}
        submitLabel="Guardar cambios"
        pending={update.isPending}
        cancelHref={`/campaigns/${campaignId}`}
        onSubmit={async (input) => {
          await update.mutateAsync({ ...input, expectedVersion: campaign.version });
          router.push(`/campaigns/${campaignId}`);
        }}
      />
    </div>
  );
}

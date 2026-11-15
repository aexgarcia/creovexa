'use client';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { useCreateStoredCampaign } from '../hooks/use-stored-campaigns';
import { emptyCampaignDraft } from '../schemas/stored-campaign-input';
import { CampaignBriefForm } from './campaign-brief-form';

export function CreateCampaignView() {
  const router = useRouter();
  const create = useCreateStoredCampaign();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva campaña"
        description="Selecciona producto, revisión de plantilla y mensaje promocional."
      />
      <CampaignBriefForm
        initialDraft={emptyCampaignDraft()}
        submitLabel="Crear campaña"
        pending={create.isPending}
        cancelHref="/campaigns"
        onSubmit={async (input) => {
          const campaign = await create.mutateAsync(input);
          router.push(`/campaigns/${campaign.id}`);
        }}
      />
    </div>
  );
}

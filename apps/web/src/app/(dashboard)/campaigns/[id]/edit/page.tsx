import { EditCampaignView } from '@/features/campaigns/components/edit-campaign-view';

interface EditCampaignPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const { id } = await params;

  return <EditCampaignView campaignId={id} />;
}

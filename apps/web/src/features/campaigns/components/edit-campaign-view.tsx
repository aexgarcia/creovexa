import { CampaignDetail } from './campaign-detail';
export function EditCampaignView({ campaignId }: { campaignId: string }) {
  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        La edición de campañas todavía no está disponible.
      </p>
      <CampaignDetail campaignId={campaignId} />
    </>
  );
}

import { ImageIcon } from 'lucide-react';

import type { Campaign } from '../types/campaign.types';

interface CampaignPreviewProps {
  campaign: Campaign;
}

export function CampaignPreview({ campaign }: CampaignPreviewProps) {
  const finalAssetUrl = campaign.generatedContent?.finalAssetUrl;

  if (!finalAssetUrl) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
            <ImageIcon className="size-6 text-muted-foreground" />
          </div>

          <p className="mt-4 font-medium">Aún no hay publicidad generada</p>

          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Genera la campaña para obtener el flyer final listo para previsualizar y aprobar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-muted/20">
      <img
        src={finalAssetUrl}
        alt={`Publicidad generada para ${campaign.name}`}
        className="h-auto w-full object-contain"
      />
    </div>
  );
}

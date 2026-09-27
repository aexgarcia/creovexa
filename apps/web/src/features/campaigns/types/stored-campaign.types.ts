export type StoredCampaignStatus =
  | 'DRAFT'
  | 'GENERATING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'PARTIALLY_PUBLISHED'
  | 'FAILED';
export const campaignStatusLabels: Record<StoredCampaignStatus, string> = {
  DRAFT: 'Borrador',
  GENERATING: 'Generando',
  PENDING_APPROVAL: 'Pendiente de aprobación',
  APPROVED: 'Aprobada',
  PUBLISHING: 'Publicando',
  PUBLISHED: 'Publicada',
  PARTIALLY_PUBLISHED: 'Publicada parcialmente',
  FAILED: 'Fallida',
};
export interface CampaignPromotion {
  amountMinor: number;
  currency: 'PEN' | 'USD' | 'EUR';
  startsAt: string | null;
  endsAt: string | null;
}
export interface StoredCampaign {
  id: string;
  organizationId: string;
  productId: string;
  templateId: string;
  templateRevisionId: string;
  title: string;
  instructions: string;
  cta: string;
  promotion: CampaignPromotion | null;
  status: StoredCampaignStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  approvedContentId: string | null;
  candidateContent: {
    id: string;
    revision: number;
    headline: string;
    caption: string;
    cta: string;
    hashtags: string[];
    assetIds: string[];
    createdAt: string;
  } | null;
}
export interface CreateStoredCampaignInput {
  productId: string;
  templateId: string;
  templateRevisionId: string;
  title: string;
  instructions?: string;
  cta: string;
  promotion?: {
    amountMinor: number;
    currency: CampaignPromotion['currency'];
    startsAt?: string;
    endsAt?: string;
  };
}
export interface StoredPublication {
  id: string;
  campaignId: string;
  approvedContentId: string;
  socialAccountId: string;
  platform: 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK';
  status: 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
  attempt: { id: string; number: number; startedAt: string } | null;
  externalPostId: string | null;
  failureCode: string | null;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus =
  | 'DRAFT'
  | 'GENERATING_COPY'
  | 'GENERATING_IMAGE'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED';

export type GeneratedContentStatus = 'CURRENT' | 'STALE';

export type SocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK';

export type PublicationStatus = 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';

export interface GeneratedCampaignContent {
  headline: string;
  caption: string;
  cta: string;
  hashtags: string[];

  /**
   * Flyer/publicidad final generado.
   *
   * En producción será una URL de MinIO/S3/R2/etc.
   */
  finalAssetUrl: string | null;
}

export interface CampaignPublication {
  id: string;

  platform: SocialPlatform;

  status: PublicationStatus;

  externalPublicationId: string | null;

  externalUrl: string | null;

  failureReason: string | null;
}

export interface Campaign {
  id: string;

  name: string;

  productId: string;
  productName: string;

  /**
   * Única imagen asociada al producto/servicio.
   */
  productImageUrl: string | null;

  templateId: string;
  templateName: string;

  status: CampaignStatus;

  promotionStart: string | null;
  promotionEnd: string | null;

  additionalInstructions: string | null;

  generatedContent: GeneratedCampaignContent | null;

  generatedContentStatus: GeneratedContentStatus | null;

  publications: CampaignPublication[];

  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignInput {
  name: string;

  productId: string;

  templateId: string;

  promotionStart?: string;

  promotionEnd?: string;

  additionalInstructions?: string;
}

export interface PublishCampaignInput {
  campaignId: string;
  platforms: SocialPlatform[];
}

export interface CampaignGenerationInput {
  campaignId: string;
}

export interface CampaignGenerationResult {
  campaignId: string;

  headline: string;

  caption: string;

  cta: string;

  hashtags: string[];

  finalAssetUrl: string;
}

export type UpdateCampaignInput = CreateCampaignInput;

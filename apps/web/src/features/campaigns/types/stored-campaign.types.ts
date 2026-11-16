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
// Para qué es la campaña: orienta el diseño del flyer.
export type CampaignObjective = 'PROMOTION' | 'LAUNCH' | 'SEASONAL' | 'AWARENESS' | 'EVENT';
export const campaignObjectiveLabels: Record<CampaignObjective, string> = {
  PROMOTION: 'Promoción: destacar el precio',
  LAUNCH: 'Lanzamiento: presentar algo nuevo',
  SEASONAL: 'Temporada o fecha especial',
  AWARENESS: 'Recordación de marca',
  EVENT: 'Evento',
};
// Canal principal del copy (ADR-0032): cambia la longitud del texto y los hashtags.
export type CopyChannel = 'INSTAGRAM' | 'FACEBOOK' | 'WHATSAPP';
export const copyChannelLabels: Record<CopyChannel, string> = {
  INSTAGRAM: 'Instagram: 300 a 600 caracteres y 3 a 5 hashtags',
  FACEBOOK: 'Facebook: hasta 700 caracteres y pocos hashtags',
  WHATSAPP: 'WhatsApp: texto corto, sin hashtags',
};
export const copyChannelNames: Record<CopyChannel, string> = {
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  WHATSAPP: 'WhatsApp',
};
export interface CampaignPromotion {
  amountMinor: number;
  currency: 'PEN' | 'USD' | 'EUR';
  startsAt: string | null;
  endsAt: string | null;
  // Se imprimen tal cual en el flyer.
  conditions: string | null;
  // El porcentaje lo calcula el sistema.
  showDiscount: boolean;
}
export interface StoredCampaign {
  id: string;
  organizationId: string;
  productId: string;
  productImageUrl?: string | null;
  templateId: string;
  templateRevisionId: string;
  title: string;
  objective: CampaignObjective;
  occasion: string | null;
  channel: CopyChannel;
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
    /** Subtítulo del flyer; null en contenido anterior a él o si el copy no lo trae. */
    subheadline: string | null;
    caption: string;
    cta: string;
    hashtags: string[];
    assetIds: string[];
    /** Solo el flyer compuesto; nunca la foto del producto como respaldo. */
    finalAssetUrl?: string | null;
    createdAt: string;
  } | null;
}
export interface CreateStoredCampaignInput {
  productId: string;
  templateId: string;
  templateRevisionId: string;
  title: string;
  objective: CampaignObjective;
  occasion: string | null;
  channel: CopyChannel;
  instructions?: string;
  cta: string;
  promotion?: {
    amountMinor: number;
    currency: CampaignPromotion['currency'];
    startsAt?: string;
    endsAt?: string;
    conditions: string | null;
    showDiscount: boolean;
  };
}
// Reemplaza el brief completo de un borrador; expectedVersion evita pisar otra edición.
export interface UpdateStoredCampaignInput extends CreateStoredCampaignInput {
  expectedVersion: number;
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

// Una versión del flyer de la campaña (ADR-0026), de la más nueva a la más antigua.
export interface CampaignVersion {
  generationId: string;
  number: number;
  requestedAt: string;
  current: boolean;
  // null si la generación falló o sigue en curso.
  content: {
    id: string;
    headline: string;
    subheadline: string | null;
    caption: string;
    cta: string;
    hashtags: string[];
    finalAssetUrl: string | null;
    createdAt: string;
  } | null;
  failure: string | null;
  // Los precios congelados en esa versión: pueden no ser los actuales.
  prices: {
    regular: { amountMinor: number; currency: string };
    promotion: { amountMinor: number; currency: string } | null;
  };
}

import { amountMinor } from '@/features/products/schemas/product-price';
import type {
  CampaignObjective,
  CopyChannel,
  CreateStoredCampaignInput,
  StoredCampaign,
} from '../types/stored-campaign.types';

export const INSTRUCTIONS_MAX_LENGTH = 500;
export const OCCASION_MAX_LENGTH = 60;
export const CONDITIONS_MAX_LENGTH = 120;

export interface CampaignDraft {
  title: string;
  objective: CampaignObjective;
  occasion: string;
  channel: CopyChannel;
  instructions: string;
  cta: string;
  promotionPrice: string;
  startsAt: string;
  endsAt: string;
  conditions: string;
  showDiscount: boolean;
}

export function emptyCampaignDraft(): CampaignDraft {
  return {
    title: '',
    objective: 'PROMOTION',
    occasion: '',
    channel: 'INSTAGRAM',
    instructions: '',
    cta: '',
    promotionPrice: '',
    startsAt: '',
    endsAt: '',
    conditions: '',
    showDiscount: false,
  };
}

// Fecha ISO a "YYYY-MM-DDTHH:mm" en la zona horaria del dispositivo, para datetime-local.
function localInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** El formulario con los datos de una campaña guardada, para editar el borrador. */
export function campaignDraft(campaign: StoredCampaign): CampaignDraft {
  const promotion = campaign.promotion;
  return {
    title: campaign.title,
    objective: campaign.objective,
    occasion: campaign.occasion ?? '',
    channel: campaign.channel ?? 'INSTAGRAM',
    instructions: campaign.instructions,
    cta: campaign.cta,
    promotionPrice: promotion ? (promotion.amountMinor / 100).toFixed(2) : '',
    startsAt: localInput(promotion?.startsAt ?? null),
    endsAt: localInput(promotion?.endsAt ?? null),
    conditions: promotion?.conditions ?? '',
    showDiscount: promotion?.showDiscount ?? false,
  };
}

export function campaignInput(
  draft: CampaignDraft,
  product: { id: string; regularPrice: { amountMinor: number; currency: 'PEN' | 'USD' | 'EUR' } },
  template: { id: string; currentRevision: { id: string } },
): CreateStoredCampaignInput {
  const title = draft.title.trim(),
    cta = draft.cta.trim(),
    instructions = draft.instructions.trim(),
    occasion = draft.occasion.trim(),
    conditions = draft.conditions.trim();
  if (!title || title.length > 200 || !cta || cta.length > 200)
    throw new Error('Revisa el título y la llamada a la acción.');
  if (instructions.length > INSTRUCTIONS_MAX_LENGTH)
    throw new Error(`Las indicaciones admiten hasta ${INSTRUCTIONS_MAX_LENGTH} caracteres.`);
  if (occasion.length > OCCASION_MAX_LENGTH)
    throw new Error(`La ocasión admite hasta ${OCCASION_MAX_LENGTH} caracteres.`);
  const input: CreateStoredCampaignInput = {
    productId: product.id,
    templateId: template.id,
    templateRevisionId: template.currentRevision.id,
    title,
    objective: draft.objective,
    occasion: occasion || null,
    channel: draft.channel,
    cta,
    instructions,
  };
  if (!draft.promotionPrice.trim()) {
    if (draft.startsAt || draft.endsAt || conditions || draft.showDiscount)
      throw new Error('Introduce un precio promocional para usar fechas, condiciones o descuento.');
    return input;
  }
  const price = amountMinor(draft.promotionPrice);
  if (price === null || price >= product.regularPrice.amountMinor)
    throw new Error('La promoción debe ser un importe válido inferior al precio regular.');
  if (conditions.length > CONDITIONS_MAX_LENGTH)
    throw new Error(`Las condiciones admiten hasta ${CONDITIONS_MAX_LENGTH} caracteres.`);
  const start = draft.startsAt ? new Date(draft.startsAt) : null;
  const end = draft.endsAt ? new Date(draft.endsAt) : null;
  if (
    (start && !Number.isFinite(start.getTime())) ||
    (end && !Number.isFinite(end.getTime())) ||
    (start && end && end <= start)
  )
    throw new Error('El fin debe ser posterior al inicio y las fechas deben ser válidas.');
  input.promotion = {
    amountMinor: price,
    currency: product.regularPrice.currency,
    ...(start ? { startsAt: start.toISOString() } : {}),
    ...(end ? { endsAt: end.toISOString() } : {}),
    conditions: conditions || null,
    showDiscount: draft.showDiscount,
  };
  return input;
}

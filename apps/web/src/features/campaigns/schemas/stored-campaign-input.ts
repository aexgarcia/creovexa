import { amountMinor } from '@/features/products/schemas/product-price';
import type { CreateStoredCampaignInput } from '../types/stored-campaign.types';
export interface CampaignDraft {
  title: string;
  instructions: string;
  cta: string;
  promotionPrice: string;
  startsAt: string;
  endsAt: string;
}
export function campaignInput(
  draft: CampaignDraft,
  product: { id: string; regularPrice: { amountMinor: number; currency: 'PEN' | 'USD' | 'EUR' } },
  template: { id: string; currentRevision: { id: string } },
): CreateStoredCampaignInput {
  const title = draft.title.trim(),
    cta = draft.cta.trim(),
    instructions = draft.instructions.trim();
  if (!title || title.length > 200 || !cta || cta.length > 200 || instructions.length > 5000)
    throw new Error('Revisa título, CTA e instrucciones.');
  const input: CreateStoredCampaignInput = {
    productId: product.id,
    templateId: template.id,
    templateRevisionId: template.currentRevision.id,
    title,
    cta,
    instructions,
  };
  if (!draft.promotionPrice.trim()) {
    if (draft.startsAt || draft.endsAt)
      throw new Error('Introduce un precio promocional para establecer fechas.');
    return input;
  }
  const price = amountMinor(draft.promotionPrice);
  if (price === null || price >= product.regularPrice.amountMinor)
    throw new Error('La promoción debe ser un importe válido inferior al precio regular.');
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
  };
  return input;
}

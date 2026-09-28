import type { GenerationSnapshotData } from '../domain/value-objects/generation-snapshot.js';
import { CopyGenerationError, type CampaignCopy } from './ports/copy-generator.js';
// Only factual text from the frozen snapshot and neutral editorial phrases is eligible.
export function copyChoices(input: GenerationSnapshotData) {
  const amount = (price: { amountMinor: number; currency: string }) =>
    price.currency +
    ' ' +
    (BigInt(price.amountMinor) / 100n).toString() +
    '.' +
    (BigInt(price.amountMinor) % 100n).toString().padStart(2, '0');
  const facts = [
    input.product.name,
    input.product.description,
    'Precio regular: ' + amount(input.product.regularPrice),
    input.promotion ? 'Precio promocional: ' + amount(input.promotion) : '',
    input.promotion?.startsAt ? 'Inicio: ' + input.promotion.startsAt : '',
    input.promotion?.endsAt ? 'Fin: ' + input.promotion.endsAt : '',
  ]
    .filter(Boolean)
    .join('\n');
  return {
    headline: [
      input.product.name,
      'Conoce ' + input.product.name,
      'Descubre ' + input.product.name,
    ],
    caption: [facts, 'Conoce nuestra propuesta.\n' + facts, facts + '\nConsulta más información.'],
    cta: [input.cta],
    hashtags: ['#Novedades', '#ConoceMas'],
    imagePrompt: [
      'Composición de producto sobre fondo neutro, sin texto, precios, sellos ni atributos adicionales. Referencia: ' +
        input.product.name,
      'Composición minimalista con iluminación suave, sin texto, precios, sellos ni atributos adicionales. Referencia: ' +
        input.product.name,
    ],
  };
}
export function validateCopy(value: unknown, input: GenerationSnapshotData): CampaignCopy {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new CopyGenerationError('INVALID_OUTPUT');
  const row = value as Record<string, unknown>,
    choices = copyChoices(input);
  const keys = ['headline', 'caption', 'cta', 'hashtags', 'imagePrompt'];
  if (
    Object.keys(row).length !== keys.length ||
    Object.keys(row).some((key) => !keys.includes(key))
  )
    throw new CopyGenerationError('INVALID_OUTPUT');
  for (const key of ['headline', 'caption', 'cta', 'imagePrompt'] as const) {
    if (typeof row[key] !== 'string' || row[key].length > 12000 || !choices[key].includes(row[key]))
      throw new CopyGenerationError('INVALID_OUTPUT');
  }
  if (
    !Array.isArray(row.hashtags) ||
    row.hashtags.length > 2 ||
    new Set(row.hashtags).size !== row.hashtags.length ||
    row.hashtags.some((tag) => typeof tag !== 'string' || !choices.hashtags.includes(tag))
  )
    throw new CopyGenerationError('INVALID_OUTPUT');
  return {
    headline: row.headline as string,
    caption: row.caption as string,
    cta: row.cta as string,
    hashtags: [...row.hashtags] as string[],
    imagePrompt: row.imagePrompt as string,
  };
}

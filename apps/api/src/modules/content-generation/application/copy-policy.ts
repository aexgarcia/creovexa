import type { GenerationSnapshotData } from '#app/modules/campaigns/domain/value-objects/generation-snapshot';
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
    facts,
    productName: input.product.name,
    requiredPrices: [input.product.regularPrice, ...(input.promotion ? [input.promotion] : [])],
    requiredPriceTexts: [
      input.product.regularPrice,
      ...(input.promotion ? [input.promotion] : []),
    ].map(amount),
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
    choices = copyChoices(input),
    keys = ['headline', 'caption', 'cta', 'hashtags', 'imagePrompt'];
  if (
    Object.keys(row).length !== keys.length ||
    Object.keys(row).some((key) => !keys.includes(key))
  )
    throw new CopyGenerationError('INVALID_OUTPUT');
  if (
    typeof row.headline !== 'string' ||
    row.headline.length < 3 ||
    row.headline.length > 200 ||
    /\b(gratis|oferta|descuento|garant[ií]a|certificado)\b/i.test(row.headline)
  )
    throw new CopyGenerationError('INVALID_OUTPUT');
  if (
    typeof row.caption !== 'string' ||
    row.caption.length < 3 ||
    row.caption.length > 12000 ||
    !row.caption.includes(choices.productName)
  )
    throw new CopyGenerationError('INVALID_OUTPUT');
  for (const price of choices.requiredPrices) {
    const exact =
      price.currency +
      ' ' +
      (BigInt(price.amountMinor) / 100n).toString() +
      '.' +
      (BigInt(price.amountMinor) % 100n).toString().padStart(2, '0');
    const reversed = exact.replace(/^([A-Z]{3})\s+/, '') + ' ' + price.currency;
    if (!row.caption.includes(exact) && !row.caption.includes(reversed))
      throw new CopyGenerationError('INVALID_OUTPUT');
  }
  if (
    row.cta !== input.cta ||
    typeof row.imagePrompt !== 'string' ||
    row.imagePrompt.length < 3 ||
    row.imagePrompt.length > 4000 ||
    /\b(certificado|gratis|garant[ií]a|descuento)\b/i.test(row.imagePrompt)
  )
    throw new CopyGenerationError('INVALID_OUTPUT');
  if (
    !Array.isArray(row.hashtags) ||
    row.hashtags.length > 5 ||
    new Set(row.hashtags).size !== row.hashtags.length ||
    row.hashtags.some(
      (tag) =>
        typeof tag !== 'string' ||
        !/^#[\p{L}0-9_]{2,40}$/u.test(tag) ||
        /#(?:gratis|oferta|descuento|garant[ií]a|certificado)/iu.test(tag),
    )
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

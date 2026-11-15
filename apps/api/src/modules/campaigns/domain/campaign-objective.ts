// Para qué es la campaña. Cambia el diseño más que cualquier otro dato: un lanzamiento destaca
// la novedad; una promoción, el precio.
export enum CampaignObjective {
  PROMOTION = 'PROMOTION',
  LAUNCH = 'LAUNCH',
  SEASONAL = 'SEASONAL',
  // Recordación de marca: mantener presente el producto o la empresa.
  AWARENESS = 'AWARENESS',
  EVENT = 'EVENT',
}

export const OCCASION_MAX_LENGTH = 60;
export const INSTRUCTIONS_MAX_LENGTH = 500;

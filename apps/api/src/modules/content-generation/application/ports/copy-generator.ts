export const COPY_GENERATOR = Symbol('COPY_GENERATOR');
import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';
// headline y subheadline son los textos del flyer, que el usuario puede corregir antes de la
// imagen; caption y hashtags son solo para la publicación.
export interface CampaignCopy {
  headline: string;
  // null si no hay subtítulo, o en copies guardados antes de que existiera.
  subheadline: string | null;
  caption: string;
  cta: string;
  hashtags: string[];
}
export interface CopyGenerator {
  assertAvailable(): void;
  generate(input: GenerationSnapshotData): Promise<unknown>;
}
export type CopyFailure = 'UNAVAILABLE' | 'TIMEOUT' | 'INVALID_OUTPUT' | 'REFUSED' | 'BUSY';
export class CopyGenerationError extends Error {
  constructor(readonly code: CopyFailure) {
    super('No se pudo generar el texto de la campaña: ' + code + '.');
    this.name = 'CopyGenerationError';
  }
}
// El titular o el subtítulo corregidos por el usuario no cumplen las reglas del flyer.
export class InvalidFlyerTextError extends Error {
  constructor(readonly field: 'headline' | 'subheadline') {
    super('El texto del flyer no es válido: ' + field + '.');
    this.name = 'InvalidFlyerTextError';
  }
}

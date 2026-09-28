import type { GenerationSnapshotData } from '../../domain/value-objects/generation-snapshot.js';
export interface CampaignCopy {
  headline: string;
  caption: string;
  cta: string;
  hashtags: string[];
  imagePrompt: string;
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

import type { EntityId } from '#app/domain/entity-id';
import type { FlyerReading, LogoAreaReview } from '../flyer-verification.js';
import type { CampaignImageSelection, ImageArtifact } from './image-artifact.js';

export const FLYER_READER = Symbol('FLYER_READER');

export interface ReadFlyerInput extends CampaignImageSelection {
  operationId: EntityId;
  image: ImageArtifact;
}

// Lectura con un modelo de visión para verificar el flyer de AI_FULL (ADR-0009). Solo
// transcribe; la comparación con el brief es de la aplicación (flyer-verification.ts).
export interface FlyerReader {
  assertAvailable(): void;
  // Transcribe el flyer final sin conocer los textos esperados.
  read(input: ReadFlyerInput): Promise<FlyerReading>;
  // Revisa si el recorte que tapará el logo tiene texto u objetos.
  reviewLogoArea(input: ReadFlyerInput): Promise<LogoAreaReview>;
}

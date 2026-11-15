// Contrato publicado del módulo campaigns.
// Otros módulos pueden importar este archivo y nada más de campaigns.
import type { EntityId } from '#app/domain/entity-id';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { CampaignStatus } from './domain/campaign-status.js';
import type { GenerationSnapshotData } from './domain/value-objects/generation-snapshot.js';

export { CampaignImageError } from './application/errors/campaign-image.error.js';
export {
  InvalidCampaignTransitionError,
  StaleGenerationResultError,
} from './domain/errors/campaign.errors.js';
export type {
  CampaignAssetPurpose,
  CampaignImageSelection,
  StoredCampaignAsset,
} from './application/ports/campaign-final-assets.js';
export type { GenerationSnapshotData };

export const CAMPAIGN_GENERATIONS = Symbol('CAMPAIGN_GENERATIONS');

export interface CampaignReference {
  organizationId: string;
  campaignId: string;
}

export interface GenerationReference {
  organizationId: EntityId;
  campaignId: EntityId;
  generationId: EntityId;
}

export interface GeneratedCampaignContent {
  id: EntityId;
  organizationId: EntityId;
  campaignId: EntityId;
  generationId: EntityId;
  revision: number;
  headline: string;
  caption: string;
  cta: string;
  hashtags: readonly string[];
  assetIds: readonly EntityId[];
}

export interface CampaignGenerationView {
  organizationId: EntityId;
  campaignId: EntityId;
  status: `${CampaignStatus}`;
  version: number;
  // La generación en curso o la última pedida, con los datos congelados para ella.
  generation: { id: EntityId; number: number; snapshot: GenerationSnapshotData } | null;
  candidateContent: GeneratedCampaignContent | null;
}

export interface RecordGeneratedContentInput extends GenerationReference {
  expectedVersion: number;
  copy: { headline: string; caption: string; cta: string; hashtags: readonly string[] };
  finalAssetId: EntityId;
  at: Date;
}

export interface CampaignGenerations {
  // Lee la campaña. Con generationId, falla si no es la generación actual.
  view(campaign: CampaignReference, generationId?: string): Promise<CampaignGenerationView>;
  // Captura el snapshot y pasa a GENERATING una campaña que lo permite.
  // Con una transacción, el cambio se confirma junto con el trabajo del llamador.
  begin(
    campaign: CampaignReference,
    transaction?: TransactionContext,
  ): Promise<CampaignGenerationView>;
  // Falla si la promoción de la campaña ya terminó en el instante dado.
  assertPromotionActive(campaign: CampaignReference, at: Date): Promise<void>;
  // Dentro de la transacción del llamador: serializa el trabajo sobre la campaña e informa si
  // la generación sigue siendo la actual y está en GENERATING, en la versión esperada si se indica.
  lock(
    generation: GenerationReference,
    transaction: TransactionContext,
    expectedVersion?: number,
  ): Promise<boolean>;
  // Dentro de la transacción del llamador: guarda el contenido y pasa a PENDING_APPROVAL.
  recordContent(
    input: RecordGeneratedContentInput,
    transaction: TransactionContext,
  ): Promise<GeneratedCampaignContent>;
}

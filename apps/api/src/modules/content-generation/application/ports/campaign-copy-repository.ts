import type { EntityId } from '#app/domain/entity-id';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { GenerationJobState } from '../generation-job.js';
import type { CampaignCopy } from './copy-generator.js';
import type { FlyerTexts } from '../copy-policy.js';
export interface CopySelection {
  organizationId: EntityId;
  campaignId: EntityId;
  generationId: EntityId;
}
export interface CopyLease extends CopySelection {
  token: EntityId;
  now: Date;
  expiresAt: Date;
}
// Resultado de corregir los textos del flyer. IMAGE_STARTED: la imagen ya está pedida, en curso
// o lista, y usaría (o usó) los textos anteriores.
export type CopyEditResult = 'UPDATED' | 'COPY_NOT_READY' | 'IMAGE_STARTED';
export interface CampaignCopyRepository {
  find(selection: CopySelection): Promise<CampaignCopy | null>;
  claim(lease: CopyLease): Promise<boolean>;
  complete(lease: CopyLease, content: CampaignCopy): Promise<void>;
  release(lease: CopyLease): Promise<void>;
  // Estado del trabajo para el CMS; una reserva que venció sin terminar cuenta como fallida.
  state(selection: CopySelection, now: Date): Promise<GenerationJobState | null>;
  // Marca el copy como pedido, dentro de la transacción que encola su trabajo. Conserva el copy READY.
  queue(selection: CopySelection, at: Date, transaction: TransactionContext): Promise<void>;
  // Registra por qué falló el trabajo. Nunca sobrescribe un copy READY.
  fail(selection: CopySelection, failureCode: string, at: Date): Promise<void>;
  // Guarda como READY un copy ya validado, dentro de la transacción que inicia la generación.
  // Lo usa la regeneración para reusar los textos de la versión anterior (ADR-0026).
  store(
    selection: CopySelection,
    content: CampaignCopy,
    at: Date,
    transaction: TransactionContext,
  ): Promise<void>;
  // Reemplaza titular y subtítulo de un copy READY, serializado con la reserva de la imagen.
  // Falla con StaleGenerationResultError si la generación dejó de ser la vigente.
  editFlyerTexts(selection: CopySelection, texts: FlyerTexts, now: Date): Promise<CopyEditResult>;
}

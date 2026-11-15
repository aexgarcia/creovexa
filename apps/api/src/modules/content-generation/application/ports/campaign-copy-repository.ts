import type { EntityId } from '#app/domain/entity-id';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { GenerationJobState } from '../generation-job.js';
import type { CampaignCopy } from './copy-generator.js';
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
}

import type { EntityId } from '#app/domain/entity-id';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { GenerationJobState } from '../generation-job.js';
import type { GeneratedCampaignContent } from '#app/modules/campaigns/contract';
import type { CampaignImageSelection } from './image-artifact.js';
import type { StoredCampaignAsset } from './storage-provider.js';

export interface CampaignImageLease extends CampaignImageSelection {
  token: EntityId;
  expectedVersion: number;
  now: Date;
  expiresAt: Date;
}

export interface CampaignImageCompletion {
  // Exactamente el copy guardado; campaigns lo convierte en el contenido que espera aprobación.
  copy: {
    headline: string;
    subheadline: string | null;
    caption: string;
    cta: string;
    hashtags: readonly string[];
  };
  baseAsset: StoredCampaignAsset;
  finalAsset: StoredCampaignAsset;
}

export interface CampaignImageRepository {
  // Reserva de forma atómica solo la revisión actual en GENERATING con copy guardado.
  // Rechaza una reserva activa; permite reclamar una vencida con un token nuevo.
  claim(lease: CampaignImageLease): Promise<boolean>;
  // En una transacción: verifica token, vencimiento al confirmar, versión, dueño y generación actual;
  // verifica los metadatos de los archivos guardados; hace que campaigns registre el contenido y PENDING_APPROVAL; cierra la reserva.
  // Nunca permite que un worker anterior confirme después de que se reclamó su reserva.
  complete(
    lease: CampaignImageLease,
    result: CampaignImageCompletion,
    at: Date,
  ): Promise<GeneratedCampaignContent>;
  // Libera solo la reserva activa de este token. Si el trabajo ya terminó, no hace nada.
  release(lease: CampaignImageLease): Promise<void>;
  // Estado del trabajo para el CMS; una reserva que venció sin terminar cuenta como fallida.
  state(selection: CampaignImageSelection, now: Date): Promise<GenerationJobState | null>;
  // Marca la imagen como pedida, dentro de la transacción que encola su trabajo.
  queue(
    selection: CampaignImageSelection,
    expectedVersion: number,
    at: Date,
    transaction: TransactionContext,
  ): Promise<void>;
  // Registra por qué falló el trabajo. Nunca sobrescribe trabajo terminado.
  fail(selection: CampaignImageSelection, failureCode: string, at: Date): Promise<void>;
}

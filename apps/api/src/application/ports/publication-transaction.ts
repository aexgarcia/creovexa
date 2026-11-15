import type { CampaignRepository } from '#app/modules/campaigns/domain/repositories/campaign.repository';
import type { PublicationRepository } from '#app/modules/publications/domain/repositories/publication.repository';

/** Un solo commit de base de datos para los dos contratos de repositorio, sin llamadas externas dentro de work. */
export interface PublicationRepositories {
  campaigns: CampaignRepository;
  publications: PublicationRepository;
}
export interface PublicationTransaction {
  run<T>(work: (repositories: PublicationRepositories) => Promise<T>): Promise<T>;
}
export const PUBLICATION_TRANSACTION = Symbol('PUBLICATION_TRANSACTION');

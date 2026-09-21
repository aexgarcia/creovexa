import type { CampaignRepository } from '#app/modules/campaigns/domain/repositories/campaign.repository';
import type { PublicationRepository } from '#app/modules/publications/domain/repositories/publication.repository';

/** One database commit for the two repository contracts, with no external calls inside work. */
export interface PublicationRepositories {
  campaigns: CampaignRepository;
  publications: PublicationRepository;
}
export interface PublicationTransaction {
  run<T>(work: (repositories: PublicationRepositories) => Promise<T>): Promise<T>;
}
export const PUBLICATION_TRANSACTION = Symbol('PUBLICATION_TRANSACTION');

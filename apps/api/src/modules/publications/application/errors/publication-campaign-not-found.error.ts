export class PublicationCampaignNotFoundError extends Error {
  constructor() {
    super('No se encontró la campaña.');
    this.name = 'PublicationCampaignNotFoundError';
  }
}

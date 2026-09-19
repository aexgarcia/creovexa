export enum CampaignResource {
  ORGANIZATION = 'ORGANIZATION',
  PRODUCT = 'PRODUCT',
  TEMPLATE_REVISION = 'TEMPLATE_REVISION',
}

export class CampaignResourceNotFoundError extends Error {
  constructor(readonly resource: CampaignResource) {
    super('No se encontró un recurso requerido por la campaña en la organización.');
    this.name = 'CampaignResourceNotFoundError';
  }
}

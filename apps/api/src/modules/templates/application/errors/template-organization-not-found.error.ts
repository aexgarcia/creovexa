export class TemplateOrganizationNotFoundError extends Error {
  constructor() {
    super('No se puede crear la plantilla: la organización no existe.');
    this.name = 'TemplateOrganizationNotFoundError';
  }
}

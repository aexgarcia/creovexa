export class ProductOrganizationNotFoundError extends Error {
  constructor() {
    super('No se puede crear el producto: la organización no existe.');
    this.name = 'ProductOrganizationNotFoundError';
  }
}

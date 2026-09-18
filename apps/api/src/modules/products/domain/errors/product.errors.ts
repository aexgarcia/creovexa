export class InvalidProductError extends Error {
  constructor(readonly field: string) {
    super(`El campo ${field} del producto no es válido.`);
    this.name = 'InvalidProductError';
  }
}

export class ProductNotFoundError extends Error {
  constructor() {
    super('No se encontró el producto en la organización.');
    this.name = 'ProductNotFoundError';
  }
}

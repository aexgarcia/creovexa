declare const entityIdBrand: unique symbol;

export type EntityId = string & { readonly [entityIdBrand]: true };

export class InvalidEntityIdError extends Error {
  constructor(readonly field: string) {
    super(`El campo ${field} debe ser un UUID válido.`);
    this.name = 'InvalidEntityIdError';
  }
}

export function entityId(value: string, field = 'id'): EntityId {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new InvalidEntityIdError(field);
  }
  return value.toLowerCase() as EntityId;
}

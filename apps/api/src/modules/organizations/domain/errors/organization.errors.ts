export class InvalidOrganizationProfileError extends Error {
  constructor(readonly field: string) {
    super(`El campo ${field} del perfil de organización no es válido.`);
    this.name = 'InvalidOrganizationProfileError';
  }
}

export class OrganizationNotFoundError extends Error {
  constructor() {
    super('No se encontró la organización.');
    this.name = 'OrganizationNotFoundError';
  }
}

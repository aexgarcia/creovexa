export class InvalidPublicationError extends Error {
  constructor(readonly field: string) {
    super(`El campo ${field} de la publicación no es válido.`);
    this.name = 'InvalidPublicationError';
  }
}

export class InvalidPublicationTransitionError extends Error {
  constructor() {
    super('La operación no está permitida en el estado actual de la publicación.');
    this.name = 'InvalidPublicationTransitionError';
  }
}

export class StalePublicationAttemptError extends Error {
  constructor() {
    super('El resultado no corresponde al intento vigente de publicación.');
    this.name = 'StalePublicationAttemptError';
  }
}

export class ConflictingPublicationResultError extends Error {
  constructor() {
    super('El intento de publicación ya tiene un resultado diferente.');
    this.name = 'ConflictingPublicationResultError';
  }
}

export class ConcurrentPublicationModificationError extends Error {
  constructor() {
    super('La publicación o su campaña cambió desde que se inició la operación.');
    this.name = 'ConcurrentPublicationModificationError';
  }
}

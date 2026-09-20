export class InvalidCampaignError extends Error {
  constructor(readonly field: string) {
    super(`El campo ${field} de la campaña no es válido.`);
    this.name = 'InvalidCampaignError';
  }
}

export class CampaignNotFoundError extends Error {
  constructor() {
    super('No se encontró la campaña en la organización.');
    this.name = 'CampaignNotFoundError';
  }
}

export class InvalidCampaignTransitionError extends Error {
  constructor() {
    super('La operación no está permitida en el estado actual de la campaña.');
    this.name = 'InvalidCampaignTransitionError';
  }
}

export class InvalidPromotionError extends Error {
  constructor(readonly field: string) {
    super(`El campo ${field} de la oferta no es válido.`);
    this.name = 'InvalidPromotionError';
  }
}

export class PromotionExpiredError extends Error {
  constructor() {
    super('La oferta de la campaña ha vencido.');
    this.name = 'PromotionExpiredError';
  }
}

export class StaleGenerationResultError extends Error {
  constructor() {
    super('El resultado no corresponde a la generación vigente.');
    this.name = 'StaleGenerationResultError';
  }
}

export class IncompleteGeneratedContentError extends Error {
  constructor(readonly field: string) {
    super(`El contenido generado no es válido o está incompleto en ${field}.`);
    this.name = 'IncompleteGeneratedContentError';
  }
}

export class ContentRevisionMismatchError extends Error {
  constructor() {
    super('La revisión no corresponde al contenido candidato de esta campaña.');
    this.name = 'ContentRevisionMismatchError';
  }
}

export class ConflictingGenerationResultError extends Error {
  constructor() {
    super('Ya existe un resultado diferente para esta generación.');
    this.name = 'ConflictingGenerationResultError';
  }
}

export class ConcurrentCampaignModificationError extends Error {
  constructor() {
    super('La campaña cambió desde que se inició la operación.');
    this.name = 'ConcurrentCampaignModificationError';
  }
}

export class InvalidPublicationSummaryError extends Error {
  constructor() {
    super('El resumen no coincide con los destinos aprobados o con su progreso de publicación.');
    this.name = 'InvalidPublicationSummaryError';
  }
}

export class StalePublicationSummaryError extends Error {
  constructor() {
    super('El resumen contiene una versión anterior de una publicación.');
    this.name = 'StalePublicationSummaryError';
  }
}

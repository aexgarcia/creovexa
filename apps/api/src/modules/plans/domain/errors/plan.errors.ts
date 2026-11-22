import type { AiUsageKind, PlanResource } from '../plan-catalog.js';

const KIND_TEXT: Record<AiUsageKind, string> = {
  IMAGE: 'flyers',
  COPY: 'textos',
  PRODUCT_SUGGESTION: 'sugerencias con IA',
};

export class PlanRequiredError extends Error {
  constructor() {
    super('La organización no tiene un plan asignado.');
    this.name = 'PlanRequiredError';
  }
}

export class AiQuotaExceededError extends Error {
  constructor(
    readonly kind: AiUsageKind,
    readonly scope: 'MONTH' | 'DAY',
    readonly limit: number,
    readonly used: number,
    readonly resetsAt: Date,
  ) {
    super(
      `Llegaste al límite ${scope === 'DAY' ? 'diario' : 'mensual'} de ${KIND_TEXT[kind]} de tu plan (${limit}).`,
    );
    this.name = 'AiQuotaExceededError';
  }
}

export class PlanLimitReachedError extends Error {
  constructor(
    readonly resource: PlanResource,
    readonly limit: number,
  ) {
    super(
      `Tu plan permite hasta ${limit} ${resource === 'PRODUCT' ? 'productos' : 'plantillas'} activos.`,
    );
    this.name = 'PlanLimitReachedError';
  }
}

// La calidad pedida no está incluida en el plan.
export class ImageQualityNotAllowedError extends Error {
  constructor(readonly quality: string) {
    super('La calidad media del flyer no está incluida en tu plan.');
    this.name = 'ImageQualityNotAllowedError';
  }
}

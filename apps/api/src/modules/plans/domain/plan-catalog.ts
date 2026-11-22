// Catálogo de planes (ADR-0033). Vive en el código para que cambiar un límite sea un cambio
// versionado y revisado.

export enum PlanCode {
  EMPRENDE = 'EMPRENDE',
  NEGOCIO = 'NEGOCIO',
  AGENCIA = 'AGENCIA',
}

// Acciones de IA que consumen cupo.
export enum AiUsageKind {
  IMAGE = 'IMAGE',
  COPY = 'COPY',
  PRODUCT_SUGGESTION = 'PRODUCT_SUGGESTION',
}

// Recursos con un máximo de activos por plan.
export enum PlanResource {
  PRODUCT = 'PRODUCT',
  TEMPLATE = 'TEMPLATE',
}

export type ImageQuality = 'LOW' | 'MEDIUM';

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  // Precio de referencia en soles, con IGV; el cobro está fuera de este módulo.
  monthlyPrice: number;
  yearlyPrice: number;
  monthly: Record<AiUsageKind, number>;
  // Tope diario; solo los flyers lo tienen.
  daily: Partial<Record<AiUsageKind, number>>;
  imageQualities: readonly ImageQuality[];
  // null: sin límite.
  resources: Record<PlanResource, number | null>;
  brands: number;
  users: number;
}

export const PLANS: Readonly<Record<PlanCode, PlanDefinition>> = Object.freeze({
  [PlanCode.EMPRENDE]: {
    code: PlanCode.EMPRENDE,
    name: 'Emprende',
    monthlyPrice: 39,
    yearlyPrice: 390,
    monthly: { IMAGE: 60, COPY: 120, PRODUCT_SUGGESTION: 50 },
    daily: { IMAGE: 10 },
    imageQualities: ['LOW'],
    resources: { PRODUCT: 50, TEMPLATE: 5 },
    brands: 1,
    users: 1,
  },
  [PlanCode.NEGOCIO]: {
    code: PlanCode.NEGOCIO,
    name: 'Negocio',
    monthlyPrice: 89,
    yearlyPrice: 890,
    monthly: { IMAGE: 200, COPY: 500, PRODUCT_SUGGESTION: 200 },
    daily: { IMAGE: 40 },
    imageQualities: ['LOW', 'MEDIUM'],
    resources: { PRODUCT: 500, TEMPLATE: 30 },
    brands: 1,
    users: 3,
  },
  [PlanCode.AGENCIA]: {
    code: PlanCode.AGENCIA,
    name: 'Agencia',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    monthly: { IMAGE: 600, COPY: 1800, PRODUCT_SUGGESTION: 600 },
    daily: { IMAGE: 120 },
    imageQualities: ['LOW', 'MEDIUM'],
    resources: { PRODUCT: null, TEMPLATE: null },
    brands: 5,
    users: 10,
  },
});

/** Unidades que consume un flyer: la calidad media cuesta unas 3 veces la baja. */
export function imageUnits(quality: ImageQuality): number {
  return quality === 'MEDIUM' ? 3 : 1;
}

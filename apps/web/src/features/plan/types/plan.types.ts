// Plan de la organización y su uso (ADR-0033).
export type PlanCode = 'EMPRENDE' | 'NEGOCIO' | 'AGENCIA';
export type AiUsageKind = 'IMAGE' | 'COPY' | 'PRODUCT_SUGGESTION';
export type ImageQuality = 'LOW' | 'MEDIUM';

export interface UsageWindow {
  used: number;
  limit: number;
  resetsAt: string;
}

export interface PlanUsage {
  plan: {
    code: PlanCode;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
    imageQualities: ImageQuality[];
    brands: number;
    users: number;
  };
  periodStart: string;
  periodResetsAt: string;
  usage: Record<AiUsageKind, { month: UsageWindow; day: UsageWindow | null }>;
  resources: Record<'PRODUCT' | 'TEMPLATE', { used: number; limit: number | null }>;
}

export const usageLabels: Record<AiUsageKind, string> = {
  IMAGE: 'Flyers',
  COPY: 'Textos',
  PRODUCT_SUGGESTION: 'Sugerencias con IA',
};

/** Unidades que consume un flyer: la calidad media cuesta como 3. */
export const imageUnits = (quality: ImageQuality) => (quality === 'MEDIUM' ? 3 : 1);

/** Lo que queda hoy de un tipo: el menor entre el mes y, si lo hay, el día. */
export function remaining(plan: PlanUsage, kind: AiUsageKind): number {
  const { month, day } = plan.usage[kind];
  const monthLeft = Math.max(0, month.limit - month.used);
  return day ? Math.min(monthLeft, Math.max(0, day.limit - day.used)) : monthLeft;
}

/** Cuándo vuelve a haber cupo si hoy no queda. */
export function nextReset(plan: PlanUsage, kind: AiUsageKind): string {
  const { month, day } = plan.usage[kind];
  const monthLeft = month.limit - month.used;
  return day && monthLeft > 0 ? day.resetsAt : month.resetsAt;
}

export function formatReset(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

// La generación corre en segundo plano; la API informa en qué punto está cada trabajo.
export type GenerationJobStatus = 'PENDING' | 'RUNNING' | 'READY' | 'FAILED';

export interface GenerationJob {
  generationId: string;
  status: GenerationJobStatus;
  failureCode: string | null;
}

// Cada cuánto vuelve a preguntar el CMS mientras un trabajo espera o corre.
export const GENERATION_POLL_MS = 2000;

export function isInProgress(job: GenerationJob | null | undefined): boolean {
  return job?.status === 'PENDING' || job?.status === 'RUNNING';
}

const failureMessages: Record<string, string> = {
  TIMEOUT: 'El proveedor de IA tardó demasiado en responder.',
  UNAVAILABLE: 'El proveedor de IA no está disponible en este momento.',
  RATE_LIMITED: 'El proveedor de IA recibió demasiadas solicitudes. Espera un momento.',
  INVALID_OUTPUT: 'El resultado no cumplió las reglas de la campaña.',
  REFUSED: 'El proveedor de IA rechazó la solicitud.',
  LOGO_UNAVAILABLE: 'No se pudo leer el logo de la empresa.',
};

export function failureMessage(job: GenerationJob): string {
  const reason = (job.failureCode && failureMessages[job.failureCode]) ?? 'No se pudo completar.';
  return reason + ' Puedes intentarlo de nuevo.';
}

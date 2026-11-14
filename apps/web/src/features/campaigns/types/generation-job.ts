// Generation runs in the background; the API reports where each job is.
export type GenerationJobStatus = 'PENDING' | 'RUNNING' | 'READY' | 'FAILED';

export interface GenerationJob {
  generationId: string;
  status: GenerationJobStatus;
  failureCode: string | null;
}

// How often the CMS asks again while a job waits or runs.
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

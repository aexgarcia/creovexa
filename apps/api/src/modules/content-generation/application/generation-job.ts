export const GENERATE_COPY_JOB = 'generate-campaign-copy';
export const GENERATE_IMAGE_JOB = 'generate-campaign-image';

// Lo que ve el CMS mientras un trabajo espera, corre o terminó.
export type GenerationJobStatus = 'PENDING' | 'RUNNING' | 'READY' | 'FAILED';

// El estado guardado de la fila del trabajo, antes de combinarlo con la campaña.
export type GenerationJobState =
  | { status: 'QUEUED' }
  | { status: 'RUNNING' }
  | { status: 'READY' }
  | { status: 'FAILED'; failureCode: string };

export function publicStatus(state: GenerationJobState): {
  status: GenerationJobStatus;
  failureCode: string | null;
} {
  if (state.status === 'FAILED') return { status: 'FAILED', failureCode: state.failureCode };
  return { status: state.status === 'QUEUED' ? 'PENDING' : state.status, failureCode: null };
}

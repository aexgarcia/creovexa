export const GENERATE_COPY_JOB = 'generate-campaign-copy';
export const GENERATE_IMAGE_JOB = 'generate-campaign-image';

// What the CMS sees while a job is waiting, running or finished.
export type GenerationJobStatus = 'PENDING' | 'RUNNING' | 'READY' | 'FAILED';

// The persisted state of the job row, before it is combined with the campaign.
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

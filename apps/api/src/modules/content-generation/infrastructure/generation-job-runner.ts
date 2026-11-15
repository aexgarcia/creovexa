import type { JobQueue } from '#app/application/ports/job-queue';
import type { JobsConfig } from '#app/config/jobs.config';
import { GENERATE_COPY_JOB, GENERATE_IMAGE_JOB } from '../application/generation-job.js';
import type { GenerationJobs } from '../application/generation-jobs.js';
import type { LocalImageArtifacts } from './local-image-artifacts.js';

// Temporales que un worker caído pudo dejar sin borrar.
const STALE_ARTIFACTS_MS = 24 * 60 * 60 * 1000;

// Conecta los trabajos de generación a la cola en los procesos configurados para ejecutarlos.
export class GenerationJobRunner {
  constructor(
    private readonly queue: JobQueue,
    private readonly jobs: GenerationJobs,
    private readonly config: JobsConfig,
    private readonly artifacts: Pick<LocalImageArtifacts, 'sweep'> | null = null,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.worker) return;
    // Una reserva dura minutos: lo que tiene más de un día ya no lo usa nadie.
    await this.artifacts?.sweep(STALE_ARTIFACTS_MS).catch(() => undefined);
    await this.queue.process(GENERATE_COPY_JOB, (payload) => this.jobs.copy(payload));
    await this.queue.process(GENERATE_IMAGE_JOB, (payload) => this.jobs.image(payload));
  }
}

import type { JobQueue } from '#app/application/ports/job-queue';
import type { JobsConfig } from '#app/config/jobs.config';
import { GENERATE_COPY_JOB, GENERATE_IMAGE_JOB } from '../application/generation-job.js';
import type { GenerationJobs } from '../application/generation-jobs.js';

// Conecta los trabajos de generación a la cola en los procesos configurados para ejecutarlos.
export class GenerationJobRunner {
  constructor(
    private readonly queue: JobQueue,
    private readonly jobs: GenerationJobs,
    private readonly config: JobsConfig,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.worker) return;
    await this.queue.process(GENERATE_COPY_JOB, (payload) => this.jobs.copy(payload));
    await this.queue.process(GENERATE_IMAGE_JOB, (payload) => this.jobs.image(payload));
  }
}

import type { JobHandler, JobQueue, QueuedJob } from '#app/application/ports/job-queue';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { UnitOfWork } from '#app/application/ports/unit-of-work';

// In-memory queue. Jobs wait until the test drains them, the way a worker would pick them up.
// It ignores the transaction, so it cannot show that a rolled back job disappears.
export class JobQueueFake implements JobQueue {
  readonly accepted: QueuedJob[] = [];
  private readonly waiting: QueuedJob[] = [];
  private readonly handlers = new Map<string, JobHandler>();

  enqueue(job: QueuedJob): Promise<void> {
    if (!this.waiting.some((other) => other.name === job.name && other.key === job.key)) {
      this.waiting.push(job);
      this.accepted.push(job);
    }
    return Promise.resolve();
  }

  process(name: string, handler: JobHandler): Promise<void> {
    this.handlers.set(name, handler);
    return Promise.resolve();
  }

  // Runs every waiting job once. A rejected handler is a failed job, not a failed test.
  async drain(): Promise<void> {
    while (this.waiting.length > 0) {
      const job = this.waiting.shift()!;
      const handler = this.handlers.get(job.name);
      if (!handler) throw new Error('Sin handler para ' + job.name);
      try {
        await handler(job.payload);
      } catch {
        // The job runner already recorded the failure where the CMS reads it.
      }
    }
  }
}

// Unit suites have no database: the work simply runs.
export const immediateUnitOfWork: UnitOfWork = {
  run: (work) => work({} as TransactionContext),
};

import type { JobHandler, JobQueue, QueuedJob } from '#app/application/ports/job-queue';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { UnitOfWork } from '#app/application/ports/unit-of-work';

// Cola en memoria. Los trabajos esperan hasta que la prueba los vacía, como los tomaría un worker.
// Ignora la transacción, así que no puede mostrar que un trabajo revertido desaparece.
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

  // Ejecuta una vez cada trabajo en espera. Un handler rechazado es un trabajo fallido, no una prueba fallida.
  async drain(): Promise<void> {
    while (this.waiting.length > 0) {
      const job = this.waiting.shift()!;
      const handler = this.handlers.get(job.name);
      if (!handler) throw new Error('Sin handler para ' + job.name);
      try {
        await handler(job.payload);
      } catch {
        // El ejecutor de trabajos ya registró el fallo donde lo lee el CMS.
      }
    }
  }
}

// Las suites unitarias no tienen base de datos: el trabajo simplemente corre.
export const immediateUnitOfWork: UnitOfWork = {
  run: (work) => work({} as TransactionContext),
};

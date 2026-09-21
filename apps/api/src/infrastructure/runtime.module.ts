import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';

export const CLOCK = Symbol('CLOCK');
export const ID_GENERATOR = Symbol('ID_GENERATOR');

@Module({
  providers: [
    { provide: CLOCK, useValue: { now: () => new Date() } satisfies Clock },
    { provide: ID_GENERATOR, useValue: { next: () => randomUUID() } satisfies IdGenerator },
  ],
  exports: [CLOCK, ID_GENERATOR],
})
export class RuntimeModule {}

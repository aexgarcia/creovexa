import { Module } from '@nestjs/common';
import { ContentGenerationModule } from './modules/content-generation/content-generation.module.js';

// Everything the worker process needs: the modules whose jobs it executes.
@Module({ imports: [ContentGenerationModule] })
export class WorkerModule {}

import { Module } from '@nestjs/common';
import { ContentGenerationModule } from './modules/content-generation/content-generation.module.js';

// Todo lo que necesita el proceso worker: los módulos cuyos trabajos ejecuta.
@Module({ imports: [ContentGenerationModule] })
export class WorkerModule {}

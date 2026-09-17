import { Module } from '@nestjs/common';
import { applicationConfigProvider } from './config/application.config.js';
import { HealthController } from './health/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [applicationConfigProvider],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { DATABASE_CONFIG, databaseConfigProvider } from '#app/config/database.config';
import { PrismaService } from './prisma.service.js';

@Module({
  providers: [databaseConfigProvider, PrismaService],
  exports: [PrismaService, DATABASE_CONFIG],
})
export class DatabaseModule {}

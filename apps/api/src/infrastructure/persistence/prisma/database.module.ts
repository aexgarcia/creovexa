import { Module } from '@nestjs/common';
import { databaseConfigProvider } from '#app/config/database.config';
import { PrismaService } from './prisma.service.js';

@Module({
  providers: [databaseConfigProvider, PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}

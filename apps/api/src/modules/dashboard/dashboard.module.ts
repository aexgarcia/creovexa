import { Module } from '@nestjs/common';
import { HttpCommonModule } from '#app/infrastructure/http-common.module';
import { DatabaseModule } from '#app/infrastructure/persistence/prisma/database.module';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { GetDashboard } from './application/get-dashboard.js';
import { PrismaDashboardReader } from './infrastructure/prisma-dashboard-reader.js';
import { DashboardController } from './presentation/dashboard.controller.js';

@Module({
  imports: [DatabaseModule, HttpCommonModule],
  controllers: [DashboardController],
  providers: [
    {
      provide: GetDashboard,
      inject: [PrismaService],
      useFactory: (client: PrismaService) => new GetDashboard(new PrismaDashboardReader(client)),
    },
  ],
})
export class DashboardModule {}

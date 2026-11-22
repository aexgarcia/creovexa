import { Module } from '@nestjs/common';
import type { Clock } from '#app/application/ports/clock';
import { HttpCommonModule } from '#app/infrastructure/http-common.module';
import { DatabaseModule } from '#app/infrastructure/persistence/prisma/database.module';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { PrismaUnitOfWork } from '#app/infrastructure/persistence/prisma/prisma-unit-of-work';
import { CLOCK, RuntimeModule } from '#app/infrastructure/runtime.module';
import { PlanPolicy } from './application/plan-policy.js';
import { PLAN_STORE, type PlanStore } from './application/ports/plan-store.js';
import { AdministerPlans } from './application/use-cases/administer-plans.js';
import { AI_QUOTA, PLAN_LIMITS } from './contract.js';
import { PrismaPlanStore } from './infrastructure/prisma-plan-store.js';
import { PlansController } from './presentation/plans.controller.js';

// Planes y cuotas de uso de IA (ADR-0033). Otros módulos usan AI_QUOTA y PLAN_LIMITS.
@Module({
  imports: [DatabaseModule, RuntimeModule, HttpCommonModule],
  controllers: [PlansController],
  providers: [
    {
      provide: PLAN_STORE,
      inject: [PrismaService],
      useFactory: (client: PrismaService) => new PrismaPlanStore(client),
    },
    {
      provide: PlanPolicy,
      inject: [PLAN_STORE, PrismaService, CLOCK],
      useFactory: (store: PlanStore, client: PrismaService, clock: Clock) =>
        new PlanPolicy(store, new PrismaUnitOfWork(client), clock),
    },
    { provide: AI_QUOTA, useExisting: PlanPolicy },
    { provide: PLAN_LIMITS, useExisting: PlanPolicy },
    {
      provide: AdministerPlans,
      inject: [PLAN_STORE, CLOCK],
      useFactory: (store: PlanStore, clock: Clock) => new AdministerPlans(store, clock),
    },
  ],
  exports: [AI_QUOTA, PLAN_LIMITS],
})
export class PlansModule {}

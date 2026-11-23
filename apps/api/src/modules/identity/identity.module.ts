import { Module } from '@nestjs/common';
import { AUTH_CONFIG, authConfigProvider, type AuthConfig } from '#app/config/auth.config';
import { DatabaseModule } from '#app/infrastructure/persistence/prisma/database.module';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { createAuth } from './infrastructure/better-auth.js';

// Instancia de Better Auth para el resto del módulo y para montar su handler HTTP.
export const BETTER_AUTH = Symbol('BETTER_AUTH');

// Identidad mínima (ADR-0012).
@Module({
  imports: [DatabaseModule],
  providers: [
    authConfigProvider,
    {
      provide: BETTER_AUTH,
      inject: [AUTH_CONFIG, PrismaService],
      useFactory: (config: AuthConfig, client: PrismaService) => createAuth(config, client),
    },
  ],
  exports: [BETTER_AUTH, AUTH_CONFIG],
})
export class IdentityModule {}

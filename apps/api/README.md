# API de Creovexa

Aplicación NestJS ubicada en `apps/api` (antes `creovexa-back`).

Desde la raíz del monorepo:

```sh
pnpm setup:env
pnpm dev:api
pnpm test
pnpm test:e2e
```

La API responde en <http://localhost:3001/health>. El entorno se configura en `apps/api/.env` y se valida al iniciar. El alias `#app/*` se resuelve tanto en TypeScript como en Node tras compilar.

La fase 1 solo contiene configuración y salud HTTP. Los módulos de negocio se incorporan desde la fase 2 respetando `architecture.md`.

Consulta [la guía de desarrollo](../../README.md) y [las decisiones de la fase 1](../../docs/phase-1.md).

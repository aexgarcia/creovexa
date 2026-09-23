# API de Creovexa

Aplicación NestJS ubicada en `apps/api` (antes `creovexa-back`).

Desde la raíz del monorepo:

```sh
pnpm setup:env
pnpm infra:up
pnpm db:migrate
pnpm db:seed:dev
pnpm dev:api
pnpm test
pnpm test:e2e
```

La API responde en <http://localhost:3001/health>. El entorno se configura en `apps/api/.env` y se valida al iniciar. El alias `#app/*` se resuelve tanto en TypeScript como en Node tras compilar.

La API incluye el catálogo de productos y plantillas. Swagger está en <http://localhost:3001/docs>; OpenAPI, en <http://localhost:3001/openapi.json>. Las respuestas de detalle usan `{ data }` y los listados `{ data, meta }`, con `page` y `limit`.

El catálogo de desarrollo utiliza la organización configurada por `db:seed:dev`. No admite seleccionar otra organización en el cuerpo, query o cabeceras; autenticación y membresías corresponden a la fase 9.

Consulta [la guía de desarrollo](../../README.md) y [las decisiones y verificaciones de la API](../../docs/phase-4-catalog.md).

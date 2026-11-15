# ADR-0004 · Contrato HTTP uniforme y errores explícitos

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fase 4
- **Ámbito:** `presentation` de todos los módulos

## Contexto

El CMS necesita respuestas predecibles y errores que pueda mostrar o reintentar sin interpretar mensajes libres.

## Decisión

- API REST en JSON. Las respuestas exitosas envuelven el resultado en `{ "data": … }`; las listas añaden `meta` con `page`, `limit`, `total` y `totalPages`.
- Los errores responden `{ "error": { "code", "message", "details?" }, "requestId" }`.
- Dominio y aplicación lanzan **clases de error explícitas** (por ejemplo `CampaignNotFoundError`). Solo `ApiExceptionFilter`, en `src/presentation/http`, las traduce a estado HTTP y `code`.
- Los requests se validan en `presentation` con `class-validator`. Requests, responses, entidades y modelos Prisma son estructuras distintas.
- La API se documenta con OpenAPI mediante `@nestjs/swagger`.

## Alternativas consideradas

- **Excepciones HTTP de NestJS desde los casos de uso:** acopla la aplicación al framework.
- **Devolver entidades o modelos Prisma:** expone estructura interna y rompe clientes al cambiar el esquema.

## Consecuencias

- Agregar un error de negocio obliga a mapearlo en el filtro; si se olvida, responde `500`.
- El filtro central ya supera las 200 líneas y conoce errores de todos los módulos. Con el cableado por módulo ([ADR-0011](0011-cableado-nestjs-por-modulo.md)) cada módulo debería registrar su propio mapeo.
- Los `code` son parte del contrato público; cada contrato de módulo lista los suyos.

# ADR-0002 · PostgreSQL con Prisma confinado a infraestructura

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fase 3
- **Ámbito:** persistencia de todos los módulos

## Contexto

Se necesita persistencia relacional con integridad fuerte (pertenencia por organización, estados, intentos) y migraciones versionadas.

## Decisión

PostgreSQL como única base de datos. Prisma como ORM, usado **solo** dentro de `infrastructure/persistence/prisma` de cada módulo. Cada repositorio traduce entre el modelo Prisma y la entidad de dominio con un mapper; los modelos Prisma nunca salen de infraestructura. Las migraciones son SQL versionado en `apps/api/prisma/migrations` y se aplican con `prisma migrate deploy`.

Identificadores UUID generados por la aplicación. Fechas `timestamptz`. Las entidades con escrituras concurrentes llevan una columna `version`.

## Alternativas consideradas

- **Usar los modelos Prisma como entidades:** menos código, pero ata las reglas de negocio al esquema y a la librería.
- **TypeORM o un query builder:** sin ventaja clara; Prisma aporta tipos generados y migraciones.

## Consecuencias

- Las reglas se prueban con repositorios en memoria; las suites de integración validan Prisma contra PostgreSQL real.
- Hay un mapper por agregado que mantener.
- PostgreSQL también puede alojar la cola de trabajos ([ADR-0008](0008-cola-de-trabajos-y-worker.md)), evitando otro servicio.

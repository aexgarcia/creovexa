# ADR-0003 · Aislamiento de datos por organización

- **Estado:** Aceptado (retroactivo)
- **Fecha de registro:** 2026-11-14 · decisión original: fases 2–3
- **Ámbito:** todos los módulos

## Contexto

Cada dato de negocio pertenece a una empresa. Se esperan pocas organizaciones (hasta unas 20), pero un cruce de datos entre clientes sería grave.

## Decisión

Base de datos y esquema compartidos. Toda tabla de negocio lleva `organization_id`, y las claves foráneas son **compuestas** e incluyen la organización, de modo que la base de datos rechaza referencias entre organizaciones. Todo método de repositorio y todo caso de uso recibe `organizationId` además del identificador del recurso. Un recurso de otra organización se responde como inexistente (`404`), nunca como prohibido.

## Alternativas consideradas

- **Una base o esquema por organización:** aislamiento más fuerte, pero migraciones y operación multiplicadas; injustificado para 20 clientes.
- **Filtrar solo en la aplicación:** un olvido en una consulta expone datos; las claves compuestas lo impiden a nivel de base.
- **Row Level Security de PostgreSQL:** buena defensa adicional; queda como mejora posible, no necesaria hoy.

## Consecuencias

- Crecer en número de organizaciones no requiere rediseño.
- Las claves e índices son más anchos.
- El aislamiento de datos no sustituye la autorización de usuarios, que todavía no existe ([ADR-0012](0012-autenticacion-antes-de-publicar.md)). Hoy la organización activa sale de `DEV_ORGANIZATION_ID`.

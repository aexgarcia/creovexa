# Fase 3 — Incremento 1: persistencia comercial

Implementado el 19 de septiembre de 2026 en `feat/prisma-commercial-persistence`, desde `main` con los PR [#4](https://github.com/aexgarcia/creovexa/pull/4) y [#5](https://github.com/aexgarcia/creovexa/pull/5) integrados.

Este incremento se integró mediante el [PR #7](https://github.com/aexgarcia/creovexa/pull/7). El estado actual continúa en [persistencia de campañas](phase-3-campaigns.md); lo siguiente documenta el alcance y las verificaciones al cerrar el incremento comercial.

Plan de la fase 3 al cerrar este incremento:

| Incremento        | Alcance                                                                                                                        | Estado       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| 1. Base comercial | Prisma, migración de organizaciones/catálogo/plantillas, repositorios actuales, composición NestJS y pruebas PostgreSQL        | Implementado |
| 2. Campañas       | Reconstrucción, snapshots, generaciones y contenido inmutables, control de versión y ports de consulta sobre datos persistidos | Pendiente    |
| 3. Publicaciones  | Persistencia de destinos e intentos, unicidad lógica y contratos de guardado coherentes con el resumen de campaña              | Pendiente    |

La fase 3 completa todavía no está terminada. Los controllers y cambios del CMS siguen fuera de este incremento.

## Resultado

- Los cinco casos de uso comerciales existentes reciben repositorios PostgreSQL mediante la composición de NestJS: crear/actualizar organización, crear/actualizar producto y crear plantilla.
- Organización y producto se reconstruyen con mappers explícitos, preservando fechas, valores y reglas de dominio. Los métodos `restore` no reciben tipos de Prisma ni reproducen actualizaciones de negocio para simular una lectura.
- Las inserciones rechazan IDs existentes. Las actualizaciones no hacen upsert ni cambian identidad, propietario, fecha de creación o tipo de catálogo.
- Consultas y escrituras de producto verifican organización. El adapter de consulta de organizaciones satisface los ports de productos y plantillas.
- La plantilla y su revisión inicial se insertan en una transacción. Una colisión en la revisión revierte también la plantilla.
- La configuración de conexión se valida, no expone credenciales en sus errores y vive fuera de dominio/aplicación. NestJS cierra el pool al destruir el módulo; las conexiones se abren al consultar.

El contrato actual de plantillas solo tiene `add`. Por eso su mapper transforma el agregado en las dos filas necesarias para insertar; no se agregan métodos de lectura/edición o un constructor de reconstrucción sin consumidor. La lectura de revisiones fijadas y la persistencia de nuevas revisiones se ampliarán al incorporar los casos de uso que las necesiten.

## Modelo de almacenamiento y decisiones

### Prisma dentro de infraestructura

Se fijan `prisma`, `@prisma/client` y `@prisma/adapter-pg` en 7.10.0, `pg` en 8.23.0 y `@types/pg` en 8.23.1. Prisma aporta schema, migraciones y cliente; el adapter y driver conectan con PostgreSQL. El driver también permite crear y eliminar esquemas de prueba sin invocar repositorios de negocio.

Se eligió la versión estable 7.10.0 frente al tag disponible de Prisma 8 que todavía era release candidate. El generador `prisma-client` emite TypeScript ESM con imports `.js`, compatible con el build actual. El cliente generado se excluye de Git, ESLint y Prettier y se regenera al comprobar tipos, ejecutar pruebas y compilar. No se agregó dotenv: Node ya permite cargar archivos de entorno.

Las clases de dominio y aplicación siguen sin imports de Prisma o NestJS. `CommercialPersistenceModule` es composición de dependencias, no una capa adicional de ejecución. Los repositorios usan mappers específicos; no hay `BaseRepository`.

Referencias de implementación: [guía oficial de Prisma 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [configuración del generador](https://www.prisma.io/docs/orm/reference/prisma-schema-reference) y [conector PostgreSQL](https://docs.prisma.io/docs/orm/core-concepts/supported-databases/postgresql).

### Importes y revisiones sin pérdida de rango

Se usa `BIGINT` para importes en unidades menores y números de revisión. `Money` admite enteros seguros de JavaScript que superan el rango de un `INTEGER` de PostgreSQL. Los mappers convierten explícitamente a/desde `bigint`; los checks SQL limitan el rango y la reconstrucción vuelve a validar los valores.

Las fechas usan `TIMESTAMPTZ(3)` y provienen del dominio, sin `@updatedAt` automático que sustituya el reloj del caso de uso. Los tipos de catálogo y monedas son enums. Las imágenes siguen siendo referencias UUID ordenadas, sin URLs ni una tabla de archivos ficticia.

### Pertenencia y revisión vigente obligatoria

El schema contiene `organizations`, `products`, `templates` y `template_revisions`. Los índices cubren creación y consultas por organización; las claves compuestas permiten verificar pertenencia en referencias y consultas. La pareja plantilla/número de revisión es única dentro de la organización.

Una plantilla requiere siempre una revisión vigente de esa misma plantilla y organización. Su clave foránea compuesta se difiere al commit con `DEFERRABLE INITIALLY DEFERRED`, lo que permite insertar plantilla y revisión en una transacción manteniendo ambos campos obligatorios. Se descartó permitir temporalmente una revisión nula o inferir la vigente con `MAX(number)`, porque ambas alternativas debilitan la referencia explícita del agregado.

La migración SQL también incluye límites de importes y revisiones, formato inicial 1080 × 1080, nombres no vacíos y fechas ordenadas. Se ejecuta dentro de `BEGIN/COMMIT`. Los checks y el carácter diferido de la FK no se expresan completamente en el schema de Prisma: deben conservarse explícitamente en las migraciones siguientes. No se deben editar migraciones ya aplicadas.

Los borrados de referencias usan restricciones, no cascadas sobre datos comerciales. Todavía no hay casos de uso de eliminación.

### Límites de concurrencia

La unicidad de identidad y números se comprueba realmente en PostgreSQL. Las pruebas incluyen dos inserciones concurrentes de la misma organización; solo una tiene éxito.

Los contratos comerciales actuales no reciben una versión esperada: las actualizaciones concurrentes de organización/producto conservan semántica de última escritura. No se promete bloqueo optimista para ellas. El contrato de campañas sí exige versión esperada y se implementará con sus pruebas en el siguiente incremento.

## Entorno y comandos

`pnpm setup:env` añade `DATABASE_URL` a `apps/api/.env` solo cuando falta, utilizando el PostgreSQL configurado en el entorno raíz. Una URL ya configurada se conserva; los secretos no se imprimen ni versionan.

Desde la raíz:

```sh
pnpm install --frozen-lockfile
pnpm setup:env
pnpm infra:up
pnpm db:migrate
pnpm test:integration
pnpm dev
```

- `db:generate`: genera el cliente.
- `db:validate`: valida el schema.
- `db:migrate`: aplica migraciones versionadas con `prisma migrate deploy`.
- Para crear otra migración, usar el CLI de Prisma en una base de desarrollo, revisar el SQL y versionarlo. Este incremento no incluye comandos de reset.

Las pruebas de integración crean un esquema aleatorio `creovexa_test_…` en `TEST_DATABASE_URL` o, si no está definida, en `DATABASE_URL`. Aplican la migración dos veces para verificar que el segundo despliegue no tiene trabajo pendiente, ejecutan las pruebas y eliminan únicamente su esquema en `finally`. No utilizan ni vacían las tablas comerciales del esquema normal. Se comprobó que no quedaron esquemas temporales después de las pruebas.

CI incorpora un PostgreSQL 17 desechable con credenciales exclusivas de ese job y ejecuta validación del schema e integración. No necesita secretos del repositorio. `/health` sigue indicando vida HTTP; no es una comprobación de disponibilidad de PostgreSQL. Su test utiliza una configuración de conexión ficticia y no abre conexiones.

## Archivos

Creados:

- `apps/api/prisma/schema.prisma`, `prisma.config.ts`, `prisma/migrations/migration_lock.toml` y `prisma/migrations/20260919000100_commercial/migration.sql`.
- `apps/api/src/config/database.config.ts`, su prueba y `environment.ts`.
- `apps/api/src/infrastructure/commercial-persistence.module.ts`.
- `apps/api/src/infrastructure/persistence/persistence.errors.ts` y `prisma/`: servicio, módulo, adapter de consulta de organización y traducción de errores.
- `apps/api/src/modules/organizations/infrastructure/persistence/prisma/`: mapper, prueba y repositorio.
- `apps/api/src/modules/products/infrastructure/persistence/prisma/`: mapper, prueba y repositorio.
- `apps/api/src/modules/templates/infrastructure/persistence/prisma/`: mapper de inserción y repositorio transaccional.
- `apps/api/scripts/test-integration.mjs`, `vitest.config.integration.ts` y `test/commercial-persistence.integration-spec.ts`.
- Este documento.

Modificados: reconstrucción de `Organization` y `Product`; composición de `AppModule`; configuración de entorno; prueba y configuración HTTP; manifiestos y lockfile; exclusiones de código generado; setup local; workflow y plantilla de PR; README, CONTRIBUTING y estado del dominio.

## Verificaciones y límites

- `pnpm test`: 261 pruebas unitarias, incluidas 12 nuevas.
- `pnpm test:integration`: 15 pruebas contra PostgreSQL, incluyendo mappers, inyección de casos de uso, aislamiento por organización, importes grandes, unicidad concurrente, ausencia de upsert, claves foráneas y rollback.
- `pnpm test:e2e`: una prueba HTTP correcta.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm db:validate` y `pnpm build`: correctos.
- La primera ejecución HTTP superó el timeout de inicialización de 10 segundos del entorno local; se ajustó a 30 segundos y la comprobación volvió a pasar.
- La migración se aplicó a PostgreSQL local después de comprobar que el esquema comercial estaba vacío. No se reseteó la base ni se modificó la base de n8n.
- El contexto NestJS compilado con ESM arrancó, consultó las cuatro tablas comerciales y cerró sus conexiones correctamente; no se crearon datos de negocio ni quedaron esquemas temporales.
- Instalación, generación y pruebas requirieron ejecución fuera del sandbox por acceso a red y procesos secundarios.

La CI modificada todavía debe ejecutarse en GitHub al subir el PR. Campañas, publicaciones, historiales e índices de sus estados permanecen pendientes de los incrementos siguientes. No hay nuevos endpoints, seeds, cuentas sociales, autenticación o envíos reales.

## Siguiente paso

Revisar este incremento mediante PR. Después implementar persistencia de campañas: reconstrucción validada del agregado, generaciones y contenido inmutables, snapshots, guardado atómico condicionado por versión y adapters de consulta hacia los módulos comerciales.

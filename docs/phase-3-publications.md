# Fase 3 — Incremento 3: persistencia de publicaciones e intentos

Implementado el 21 de septiembre de 2026 en `feat/prisma-publication-persistence`, desde `main` con el [PR #9](https://github.com/aexgarcia/creovexa/pull/9) integrado. Alcance registrado en la [issue #10](https://github.com/aexgarcia/creovexa/issues/10).

Integrado mediante el [PR #11](https://github.com/aexgarcia/creovexa/pull/11). La fase 3 está cerrada; el desarrollo actual continúa en [API de productos y plantillas](phase-4-catalog.md). Lo siguiente conserva el registro original de este incremento.

## Resultado y alcance

`Publication` se reconstruye desde PostgreSQL con su estado, versión e intento vigente. El repositorio inserta destinos pendientes y guarda una transición por versión esperada; conserva todos los intentos y sus resultados. Consultas y escrituras verifican organización. Campaña y publicaciones se guardan en una transacción compartida.

Esto completa la persistencia del dominio implementado en la fase 2. No se añaden dependencias, endpoints, envío a redes, workers ni casos de uso de orquestación. Los IDs de cuentas sociales siguen siendo referencias: su existencia, pertenencia y conexión se validarán cuando se implemente ese módulo. Estas pruebas no demuestran entrega ni idempotencia frente a proveedores externos.

## Almacenamiento

| Tabla                         | Responsabilidad                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `publications`                | Destino, contenido aprobado, plataforma, estado, versión, intento vigente y resultado actual. |
| `publication_attempts`        | Identidad global, número por publicación y fecha de cada intento.                             |
| `publication_attempt_results` | Resultado aceptado una sola vez: éxito con referencia externa o fallo con código controlado.  |

La clave única `(organizationId, campaignId, approvedContentId, socialAccountId)` evita duplicar un destino. FKs compuestas vinculan publicación, campaña, contenido e intento dentro de la misma organización. No se crea una tabla ficticia de cuentas sociales ni se almacenan credenciales.

Hay índices por organización/campaña/fecha y organización/estado/fecha, además de estado/fecha para futuras consultas de trabajo pendiente. Versiones y números usan BIGINT con límites compatibles con enteros seguros de JavaScript; fechas, TIMESTAMPTZ(3).

## Decisiones

### Guardar resumen y destinos juntos

Guardar primero una publicación y después su campaña dejaría estados contradictorios si la segunda escritura falla. `PublicationTransaction` es un port de aplicación que proporciona los contratos de ambos repositorios durante una única transacción. No expone Prisma ni importa entidades entre módulos. Su adapter los construye con el mismo cliente transaccional; `inPrismaTransaction` permite reutilizarlo sin abrir commits independientes.

El port tiene un alcance concreto: campaña y publicaciones. Se descartó un registro genérico de repositorios o un servicio que solo delegue llamadas. Los futuros casos de uso decidirán las transiciones mediante las entidades y guardarán ambos resultados dentro del callback. Las llamadas a redes, n8n u otros servicios deben quedar fuera de esta transacción.

Los triggers diferidos comprueban al commit que el resumen de la campaña coincida con todos los destinos, sus versiones, organización y contenido aprobado. También verifican la correspondencia entre el intento vigente y su resultado. Una inserción aislada, un resumen sin destinos o una actualización parcial se rechazan incluso mediante SQL directo. Las reglas de transición siguen en el dominio; las restricciones protegen la coherencia de sus representaciones persistidas. Se usan [constraint triggers diferidos de PostgreSQL](https://www.postgresql.org/docs/17/sql-createtrigger.html), porque un CHECK de una sola fila no puede garantizar esta correspondencia entre tablas.

### Concurrencia y resultados inmutables

`save` exige avanzar exactamente una versión y actualiza por organización, ID y versión esperada. No hace upsert. Las transacciones de coordinación y las lecturas con relaciones usan `RepeatableRead`; un conflicto de serialización o deadlock se traduce a `ConcurrentPublicationModificationError`. No hay reintentos automáticos de decisiones de negocio.

Los intentos y resultados se insertan una sola vez. Triggers bloquean su actualización o borrado y protegen la identidad de la publicación. Un destino publicado es terminal. Reintentar un fallo crea otro intento y conserva el resultado anterior; los destinos exitosos conservan su ID, versión y referencia externa. Se descartó sobrescribir el intento vigente como único registro porque perdería el historial de fallos.

La identidad global y el número único del intento detectan colisiones con intentos históricos. Si falla una inserción dentro de un lote, se revierten la campaña, los destinos ya actualizados y sus nuevos intentos.

### Reconstrucción validada

`Publication.restore` valida IDs, estado, fechas, versión, intento y resultado sin reproducir transiciones. El mapper convierte explícitamente enums, BIGINT y fechas y comprueba las referencias cargadas. Un callback repetido e idéntico mantiene la operación sin cambios después de recargar la entidad; resultados contradictorios o intentos antiguos se rechazan.

## Migración y uso local

`20260921000100_publications` añade las tres tablas y restricciones. Las dos migraciones anteriores permanecen intactas. Si encuentra resúmenes de publicación de incrementos anteriores, detiene la migración: aquellas versiones aún no guardaban intentos ni resultados, por lo que no hay historial suficiente para reconstruirlos. Se deben reconciliar esos registros antes del despliegue; no se borran ni se inventan publicaciones automáticamente.

```sh
pnpm infra:up
pnpm db:migrate
pnpm test:integration
```

Los checks, triggers y FKs diferidas no se reflejan completamente en el schema Prisma. Hay que conservarlos al revisar futuras migraciones y no editar migraciones ya aplicadas a una base persistente.

## Archivos

Creados:

- `apps/api/prisma/migrations/20260921000100_publications/migration.sql`.
- `apps/api/src/application/ports/publication-transaction.ts`.
- `apps/api/src/infrastructure/publication-persistence.module.ts` y `persistence/prisma/{prisma-publication-transaction,prisma-session}.ts`.
- `apps/api/src/modules/publications/domain/repositories/publication.repository.ts` y `entities/publication-restoration.spec.ts`.
- `apps/api/src/modules/publications/infrastructure/persistence/prisma/`: mapper, repositorio y pruebas del mapper.
- `apps/api/test/publication-persistence.integration-spec.ts` y `support/publication-restoration.ts`.
- Este documento.

Modificados: schema Prisma; `Publication` y sus errores; repositorio de campañas para compartir transacciones; `AppModule`; prueba de campañas que antes aceptaba resúmenes sin destinos; README, estado del dominio y referencia histórica del incremento anterior.

## Verificación

- Suite unitaria: 326 pruebas correctas, incluidas 30 nuevas de reconstrucción y mapper.
- `pnpm test:integration`: 52 pruebas correctas, incluidas 16 de publicaciones. Se aplican las tres migraciones a un esquema temporal y se comprueba un segundo despliegue sin pendientes. También se verifica que los resúmenes anteriores sin historial detengan la migración.
- Las pruebas cubren éxitos parciales, reintentos, callbacks repetidos/antiguos, concurrencia con un único ganador, versiones obsoletas, colisiones con rollback del lote, unicidad de destinos e intentos, aislamiento por organización y protección del historial en SQL.
- `pnpm typecheck`, `pnpm lint`, `pnpm db:validate` y `pnpm build`: correctos.
- `pnpm test:e2e`: una prueba HTTP correcta.
- Migración aplicada a PostgreSQL local sin reset; las ocho tablas anteriores permanecen vacías y las tres nuevas también. No se crearon datos de negocio ni se modificó la base independiente de n8n.
- El build ESM de NestJS consultó las once tablas, el repositorio de publicaciones y ambos repositorios dentro de la transacción compartida. Las conexiones se cerraron correctamente. No quedaron esquemas temporales de pruebas.
- `pnpm format:check`: correcto con la configuración compartida anterior de Prettier a 100 columnas.

La CI remota se ejecutará al subir el PR. Las pruebas de integración utilizan PostgreSQL real; el envío a redes continúa fuera de alcance.

## Siguiente paso

Revisar e integrar este incremento mediante PR para cerrar la fase 3. Después iniciar un incremento acotado de la fase 4: contratos HTTP, validación, traducción de errores y endpoints de catálogo con sus pruebas. Los endpoints de generación/publicación deben respetar las dependencias pendientes de las fases posteriores.

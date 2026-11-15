# Fase 3 · Persistencia

> Historial consolidado de los documentos originales `docs/phase-*.md`. Registra lo que se decidió y verificó en su momento; el estado vigente está en [estado de fases](../fases/estado.md) y en los [contratos de módulo](../modulos/).

## Fase 3 — Incremento 1: persistencia comercial

Implementado el 19 de septiembre de 2026 en `feat/prisma-commercial-persistence`, desde `main` con los PR [#4](https://github.com/aexgarcia/creovexa/pull/4) y [#5](https://github.com/aexgarcia/creovexa/pull/5) integrados.

Este incremento se integró mediante el [PR #7](https://github.com/aexgarcia/creovexa/pull/7). El estado actual continúa en [persistencia de campañas](fase-3.md); lo siguiente documenta el alcance y las verificaciones al cerrar el incremento comercial.

Plan de la fase 3 al cerrar este incremento:

| Incremento        | Alcance                                                                                                                        | Estado       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| 1. Base comercial | Prisma, migración de organizaciones/catálogo/plantillas, repositorios actuales, composición NestJS y pruebas PostgreSQL        | Implementado |
| 2. Campañas       | Reconstrucción, snapshots, generaciones y contenido inmutables, control de versión y ports de consulta sobre datos persistidos | Pendiente    |
| 3. Publicaciones  | Persistencia de destinos e intentos, unicidad lógica y contratos de guardado coherentes con el resumen de campaña              | Pendiente    |

La fase 3 completa todavía no está terminada. Los controllers y cambios del CMS siguen fuera de este incremento.

### Resultado

- Los cinco casos de uso comerciales existentes reciben repositorios PostgreSQL mediante la composición de NestJS: crear/actualizar organización, crear/actualizar producto y crear plantilla.
- Organización y producto se reconstruyen con mappers explícitos, preservando fechas, valores y reglas de dominio. Los métodos `restore` no reciben tipos de Prisma ni reproducen actualizaciones de negocio para simular una lectura.
- Las inserciones rechazan IDs existentes. Las actualizaciones no hacen upsert ni cambian identidad, propietario, fecha de creación o tipo de catálogo.
- Consultas y escrituras de producto verifican organización. El adapter de consulta de organizaciones satisface los ports de productos y plantillas.
- La plantilla y su revisión inicial se insertan en una transacción. Una colisión en la revisión revierte también la plantilla.
- La configuración de conexión se valida, no expone credenciales en sus errores y vive fuera de dominio/aplicación. NestJS cierra el pool al destruir el módulo; las conexiones se abren al consultar.

El contrato actual de plantillas solo tiene `add`. Por eso su mapper transforma el agregado en las dos filas necesarias para insertar; no se agregan métodos de lectura/edición o un constructor de reconstrucción sin consumidor. La lectura de revisiones fijadas y la persistencia de nuevas revisiones se ampliarán al incorporar los casos de uso que las necesiten.

### Modelo de almacenamiento y decisiones

#### Prisma dentro de infraestructura

Se fijan `prisma`, `@prisma/client` y `@prisma/adapter-pg` en 7.10.0, `pg` en 8.23.0 y `@types/pg` en 8.23.1. Prisma aporta schema, migraciones y cliente; el adapter y driver conectan con PostgreSQL. El driver también permite crear y eliminar esquemas de prueba sin invocar repositorios de negocio.

Se eligió la versión estable 7.10.0 frente al tag disponible de Prisma 8 que todavía era release candidate. El generador `prisma-client` emite TypeScript ESM con imports `.js`, compatible con el build actual. El cliente generado se excluye de Git, ESLint y Prettier y se regenera al comprobar tipos, ejecutar pruebas y compilar. No se agregó dotenv: Node ya permite cargar archivos de entorno.

Las clases de dominio y aplicación siguen sin imports de Prisma o NestJS. `CommercialPersistenceModule` es composición de dependencias, no una capa adicional de ejecución. Los repositorios usan mappers específicos; no hay `BaseRepository`.

Referencias de implementación: [guía oficial de Prisma 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [configuración del generador](https://www.prisma.io/docs/orm/reference/prisma-schema-reference) y [conector PostgreSQL](https://docs.prisma.io/docs/orm/core-concepts/supported-databases/postgresql).

#### Importes y revisiones sin pérdida de rango

Se usa `BIGINT` para importes en unidades menores y números de revisión. `Money` admite enteros seguros de JavaScript que superan el rango de un `INTEGER` de PostgreSQL. Los mappers convierten explícitamente a/desde `bigint`; los checks SQL limitan el rango y la reconstrucción vuelve a validar los valores.

Las fechas usan `TIMESTAMPTZ(3)` y provienen del dominio, sin `@updatedAt` automático que sustituya el reloj del caso de uso. Los tipos de catálogo y monedas son enums. Las imágenes siguen siendo referencias UUID ordenadas, sin URLs ni una tabla de archivos ficticia.

#### Pertenencia y revisión vigente obligatoria

El schema contiene `organizations`, `products`, `templates` y `template_revisions`. Los índices cubren creación y consultas por organización; las claves compuestas permiten verificar pertenencia en referencias y consultas. La pareja plantilla/número de revisión es única dentro de la organización.

Una plantilla requiere siempre una revisión vigente de esa misma plantilla y organización. Su clave foránea compuesta se difiere al commit con `DEFERRABLE INITIALLY DEFERRED`, lo que permite insertar plantilla y revisión en una transacción manteniendo ambos campos obligatorios. Se descartó permitir temporalmente una revisión nula o inferir la vigente con `MAX(number)`, porque ambas alternativas debilitan la referencia explícita del agregado.

La migración SQL también incluye límites de importes y revisiones, formato inicial 1080 × 1080, nombres no vacíos y fechas ordenadas. Se ejecuta dentro de `BEGIN/COMMIT`. Los checks y el carácter diferido de la FK no se expresan completamente en el schema de Prisma: deben conservarse explícitamente en las migraciones siguientes. No se deben editar migraciones ya aplicadas.

Los borrados de referencias usan restricciones, no cascadas sobre datos comerciales. Todavía no hay casos de uso de eliminación.

#### Límites de concurrencia

La unicidad de identidad y números se comprueba realmente en PostgreSQL. Las pruebas incluyen dos inserciones concurrentes de la misma organización; solo una tiene éxito.

Los contratos comerciales actuales no reciben una versión esperada: las actualizaciones concurrentes de organización/producto conservan semántica de última escritura. No se promete bloqueo optimista para ellas. El contrato de campañas sí exige versión esperada y se implementará con sus pruebas en el siguiente incremento.

### Entorno y comandos

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

### Archivos

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

### Verificaciones y límites

- `pnpm test`: 261 pruebas unitarias, incluidas 12 nuevas.
- `pnpm test:integration`: 15 pruebas contra PostgreSQL, incluyendo mappers, inyección de casos de uso, aislamiento por organización, importes grandes, unicidad concurrente, ausencia de upsert, claves foráneas y rollback.
- `pnpm test:e2e`: una prueba HTTP correcta.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm db:validate` y `pnpm build`: correctos.
- La primera ejecución HTTP superó el timeout de inicialización de 10 segundos del entorno local; se ajustó a 30 segundos y la comprobación volvió a pasar.
- La migración se aplicó a PostgreSQL local después de comprobar que el esquema comercial estaba vacío. No se reseteó la base ni se modificó la base de n8n.
- El contexto NestJS compilado con ESM arrancó, consultó las cuatro tablas comerciales y cerró sus conexiones correctamente; no se crearon datos de negocio ni quedaron esquemas temporales.
- Instalación, generación y pruebas requirieron ejecución fuera del sandbox por acceso a red y procesos secundarios.

La CI modificada todavía debe ejecutarse en GitHub al subir el PR. Campañas, publicaciones, historiales e índices de sus estados permanecen pendientes de los incrementos siguientes. No hay nuevos endpoints, seeds, cuentas sociales, autenticación o envíos reales.

### Siguiente paso

Revisar este incremento mediante PR. Después implementar persistencia de campañas: reconstrucción validada del agregado, generaciones y contenido inmutables, snapshots, guardado atómico condicionado por versión y adapters de consulta hacia los módulos comerciales.

## Fase 3 — Incremento 2: persistencia de campañas

Implementado el 20 de septiembre de 2026 en `feat/prisma-campaign-persistence`, desde `main` con el [PR #7](https://github.com/aexgarcia/creovexa/pull/7) integrado. Alcance registrado en la [issue #8](https://github.com/aexgarcia/creovexa/issues/8).

Integrado mediante el [PR #9](https://github.com/aexgarcia/creovexa/pull/9). El estado actual continúa en [persistencia de publicaciones](fase-3.md); este documento conserva las decisiones y verificaciones al cerrar el incremento 2. El incremento 3 exige guardar el resumen y sus destinos en la misma transacción.

### Resultado y alcance

Los seis casos de uso existentes de campañas quedan compuestos en NestJS con persistencia PostgreSQL: crear, solicitar generación, registrar contenido, registrar fallo, aprobar y solicitar regeneración. Dominio y aplicación permanecen sin imports de Prisma o NestJS. No se agregan dependencias.

Se conservan los contratos de aplicación y repositorio. `add` inserta un borrador inicial; `save` exige la siguiente versión del agregado y la versión esperada de la fila. Una actualización no crea campañas ausentes ni cambia su identidad, propietario, referencias comerciales, instrucciones u oferta.

Este incremento no agrega controllers, pantallas, n8n, proveedores de IA ni envío de publicaciones. El resumen de publicación que ya pertenece a `Campaign` se reconstruye y guarda; las entidades `Publication`, sus intentos y su coordinación transaccional siguen pendientes del incremento 3.

### Almacenamiento

| Tabla                          | Responsabilidad                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `campaigns`                    | Estado vigente, referencias comerciales, oferta, contenido candidato/aprobado, destinos aprobados, resumen y versión. |
| `campaign_generations`         | Identidad y número de cada generación, fecha de solicitud y snapshot comercial completo.                              |
| `generated_contents`           | Resultado aceptado de una generación: textos, hashtags, referencias de assets y fecha.                                |
| `campaign_generation_failures` | Código controlado y fecha del fallo aceptado para una generación; se conserva tras reintentar.                        |

Cada contenido referencia una generación de la misma campaña y organización. Su revisión y snapshot se reconstruyen a partir de esa generación inmutable, evitando duplicar dos copias del mismo snapshot en SQL. El agregado solo carga la generación vigente y su candidato; conservar el historial no obliga a cargarlo completo en cada operación.

Se usa JSONB para el snapshot comercial, la oferta y el resumen ya definido por el dominio. No se serializa toda la entidad en una columna: identidades, estado, relaciones, versiones y fechas conservan columnas y restricciones propias. Los decodificadores de JSON validan tipos y reconstruyen objetos de dominio; no convierten JSON arbitrario mediante un cast a una entidad.

Los números de generación y versión usan BIGINT con límite de entero seguro de JavaScript. El snapshot conserva también importes mayores que INT32 sin pérdida de precisión. Las fechas usan TIMESTAMPTZ(3).

### Decisiones

#### Estado e historial en una transacción

El problema es que dos workers pueden cargar la misma versión y aceptar resultados incompatibles. El repositorio ejecuta `updateMany` filtrando por organización, ID y versión esperada, y exige una única fila modificada. Si otro escritor ganó, lanza `ConcurrentCampaignModificationError`.

La actualización y las inserciones del historial comparten una transacción. Las referencias a la generación y al candidato se verifican al commit mediante FKs compuestas `DEFERRABLE INITIALLY DEFERRED`. Así se puede reservar primero la escritura de la raíz y luego insertar sus nuevos registros. Una colisión de identidad, FK o validación revierte también el cambio de versión.

Se descartó leer la versión y después actualizar solo por ID: esa comprobación no protege de escrituras simultáneas. Tampoco se usa upsert o un `BaseRepository`. No hay reintento automático que vuelva a ejecutar una decisión de negocio con datos diferentes. Referencia: [transacciones y concurrencia optimista en Prisma 7](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions).

`findById` usa una transacción de lectura `RepeatableRead`, para que las consultas de la raíz y sus relaciones correspondan a la misma vista de PostgreSQL. Las transacciones no contienen llamadas a integraciones externas.

#### Historial que no se sobrescribe

Generaciones, contenidos y fallos aceptados se insertan una sola vez. El repositorio compara los valores cuando una transición conserva la misma identidad; no usa actualizaciones o upserts sobre estos registros. Los triggers SQL bloquean UPDATE y DELETE del historial, incluso si se elude el repositorio.

La generación tiene identidad global y número único por campaña/organización; existe como máximo un contenido por generación. Los fallos se guardan aparte para que solicitar otra generación no borre la explicación anterior. Se descartó mantener solo el código de fallo de la raíz porque se perdería al reintentar.

Un callback repetido con el mismo resultado continúa siendo una operación sin cambios, incluso después de volver a cargar la campaña. Un callback de una generación anterior se rechaza. Las publicaciones e integraciones futuras siguen necesitando sus propias garantías de idempotencia.

#### Reconstrucción sin ejecutar transiciones

`Campaign.restore` comprueba IDs, estado, fechas, contadores, pertenencia del snapshot/contenido, aprobación y coherencia del resumen. Copia los contenedores de entrada. No simula solicitudes, callbacks ni aprobaciones para reconstruir la entidad.

`Promotion.restore` comprueba valores intrínsecos y período sin consultar el precio actual del producto. Una oferta histórica puede leerse después de vencer o de editar el catálogo; los comandos de negocio siguen validando el vencimiento cuando corresponde. La comparación con el precio comercial se mantiene al crear la campaña y capturar una nueva generación.

`PublicationProgress.restore` reconstruye resultados ya iniciados o terminados conservando sus versiones y destinos. No crea publicaciones ni prueba su existencia en una tabla todavía inexistente.

#### Consultas y composición

`PrismaCampaignLookups` implementa los ports del consumidor con proyecciones mínimas de organización, producto y revisión de plantilla. Todas las consultas dependientes verifican organización. La revisión se busca por la identidad fijada en la campaña, aunque la plantilla tenga otra revisión vigente.

`CampaignPersistenceModule` compone los casos de uso. Reloj e IDs se movieron a `RuntimeModule` porque ahora los necesitan dos módulos; así comparten un proveedor reemplazable en pruebas sin depender de la composición comercial. No se agregaron servicios intermediarios.

### Migración y uso local

La migración `20260920000100_campaigns` es incremental. La migración comercial ya integrada permanece intacta. La nueva migración incluye FKs por organización, índices por organización/estado/fecha, unicidad, límites de enteros, restricciones de estado y protección del historial.

```sh
pnpm infra:up
pnpm db:migrate
pnpm test:integration
```

Los triggers, checks y FKs diferidas no están representados por completo en el schema Prisma. Deben conservarse al revisar futuras migraciones. No se deben editar migraciones ya aplicadas a una base persistente.

### Archivos

Creados:

- `apps/api/prisma/migrations/20260920000100_campaigns/migration.sql`.
- `apps/api/src/infrastructure/campaign-persistence.module.ts` y `runtime.module.ts`.
- `apps/api/src/modules/campaigns/infrastructure/persistence/prisma/`: mapper, decodificador JSON, adapter de consultas, repositorio y pruebas JSON.
- `apps/api/src/modules/campaigns/domain/entities/campaign-restoration.spec.ts`.
- `apps/api/test/campaign-persistence.integration-spec.ts` y `support/campaign-restoration.ts`.
- Este documento.

Modificados: schema Prisma; reconstrucción de `Campaign`, `Promotion` y `PublicationProgress`; composición de `AppModule` y módulo comercial; import del reloj en pruebas comerciales; README y estado de la documentación de dominio/persistencia.

### Verificación

- Suite unitaria (`pnpm exec vitest run` desde `apps/api`): 296 pruebas correctas, incluidas 35 nuevas.
- `pnpm test:integration`: 36 pruebas correctas; 21 de campañas y las 15 comerciales existentes. El runner aplica ambas migraciones y verifica un segundo despliegue sin pendientes en un esquema temporal.
- Las pruebas incluyen escritura concurrente con un único ganador, versiones obsoletas, colisiones con rollback, ausencia de upsert, pertenencia, callbacks duplicados/antiguos, revisiones fijadas, importes grandes y conservación/protección SQL del historial.
- `pnpm typecheck`, `pnpm lint`, `pnpm db:validate`, `pnpm format:check` y `pnpm build`: correctos.
- `pnpm test:e2e`: una prueba HTTP correcta; el arranque no requiere consultar PostgreSQL.
- La migración incremental se aplicó a PostgreSQL local. Se conservaron las cuatro tablas comerciales, sin reset ni cambios en la base de n8n.
- El build ESM de NestJS consultó las ocho tablas y ejecutó una consulta del repositorio de campañas; cerró sus conexiones correctamente. No se crearon datos de negocio ni quedaron esquemas temporales de pruebas.

La CI remota se ejecutará al subir el PR. Las pruebas SQL son de integración contra PostgreSQL real; no garantizan entregas de IA o redes sociales, que aún no forman parte del alcance.

### Siguiente incremento

Revisar este incremento mediante PR. Después persistir publicaciones e intentos con unicidad por destino, control de versión y un contrato de escritura que mantenga coherente el resumen de campaña. La fase 3 completa todavía está en curso.

## Fase 3 — Incremento 3: persistencia de publicaciones e intentos

Implementado el 21 de septiembre de 2026 en `feat/prisma-publication-persistence`, desde `main` con el [PR #9](https://github.com/aexgarcia/creovexa/pull/9) integrado. Alcance registrado en la [issue #10](https://github.com/aexgarcia/creovexa/issues/10).

Integrado mediante el [PR #11](https://github.com/aexgarcia/creovexa/pull/11). La fase 3 está cerrada; el desarrollo actual continúa en [API de productos y plantillas](fase-4.md). Lo siguiente conserva el registro original de este incremento.

### Resultado y alcance

`Publication` se reconstruye desde PostgreSQL con su estado, versión e intento vigente. El repositorio inserta destinos pendientes y guarda una transición por versión esperada; conserva todos los intentos y sus resultados. Consultas y escrituras verifican organización. Campaña y publicaciones se guardan en una transacción compartida.

Esto completa la persistencia del dominio implementado en la fase 2. No se añaden dependencias, endpoints, envío a redes, workers ni casos de uso de orquestación. Los IDs de cuentas sociales siguen siendo referencias: su existencia, pertenencia y conexión se validarán cuando se implemente ese módulo. Estas pruebas no demuestran entrega ni idempotencia frente a proveedores externos.

### Almacenamiento

| Tabla                         | Responsabilidad                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `publications`                | Destino, contenido aprobado, plataforma, estado, versión, intento vigente y resultado actual. |
| `publication_attempts`        | Identidad global, número por publicación y fecha de cada intento.                             |
| `publication_attempt_results` | Resultado aceptado una sola vez: éxito con referencia externa o fallo con código controlado.  |

La clave única `(organizationId, campaignId, approvedContentId, socialAccountId)` evita duplicar un destino. FKs compuestas vinculan publicación, campaña, contenido e intento dentro de la misma organización. No se crea una tabla ficticia de cuentas sociales ni se almacenan credenciales.

Hay índices por organización/campaña/fecha y organización/estado/fecha, además de estado/fecha para futuras consultas de trabajo pendiente. Versiones y números usan BIGINT con límites compatibles con enteros seguros de JavaScript; fechas, TIMESTAMPTZ(3).

### Decisiones

#### Guardar resumen y destinos juntos

Guardar primero una publicación y después su campaña dejaría estados contradictorios si la segunda escritura falla. `PublicationTransaction` es un port de aplicación que proporciona los contratos de ambos repositorios durante una única transacción. No expone Prisma ni importa entidades entre módulos. Su adapter los construye con el mismo cliente transaccional; `inPrismaTransaction` permite reutilizarlo sin abrir commits independientes.

El port tiene un alcance concreto: campaña y publicaciones. Se descartó un registro genérico de repositorios o un servicio que solo delegue llamadas. Los futuros casos de uso decidirán las transiciones mediante las entidades y guardarán ambos resultados dentro del callback. Las llamadas a redes, n8n u otros servicios deben quedar fuera de esta transacción.

Los triggers diferidos comprueban al commit que el resumen de la campaña coincida con todos los destinos, sus versiones, organización y contenido aprobado. También verifican la correspondencia entre el intento vigente y su resultado. Una inserción aislada, un resumen sin destinos o una actualización parcial se rechazan incluso mediante SQL directo. Las reglas de transición siguen en el dominio; las restricciones protegen la coherencia de sus representaciones persistidas. Se usan [constraint triggers diferidos de PostgreSQL](https://www.postgresql.org/docs/17/sql-createtrigger.html), porque un CHECK de una sola fila no puede garantizar esta correspondencia entre tablas.

#### Concurrencia y resultados inmutables

`save` exige avanzar exactamente una versión y actualiza por organización, ID y versión esperada. No hace upsert. Las transacciones de coordinación y las lecturas con relaciones usan `RepeatableRead`; un conflicto de serialización o deadlock se traduce a `ConcurrentPublicationModificationError`. No hay reintentos automáticos de decisiones de negocio.

Los intentos y resultados se insertan una sola vez. Triggers bloquean su actualización o borrado y protegen la identidad de la publicación. Un destino publicado es terminal. Reintentar un fallo crea otro intento y conserva el resultado anterior; los destinos exitosos conservan su ID, versión y referencia externa. Se descartó sobrescribir el intento vigente como único registro porque perdería el historial de fallos.

La identidad global y el número único del intento detectan colisiones con intentos históricos. Si falla una inserción dentro de un lote, se revierten la campaña, los destinos ya actualizados y sus nuevos intentos.

#### Reconstrucción validada

`Publication.restore` valida IDs, estado, fechas, versión, intento y resultado sin reproducir transiciones. El mapper convierte explícitamente enums, BIGINT y fechas y comprueba las referencias cargadas. Un callback repetido e idéntico mantiene la operación sin cambios después de recargar la entidad; resultados contradictorios o intentos antiguos se rechazan.

### Migración y uso local

`20260921000100_publications` añade las tres tablas y restricciones. Las dos migraciones anteriores permanecen intactas. Si encuentra resúmenes de publicación de incrementos anteriores, detiene la migración: aquellas versiones aún no guardaban intentos ni resultados, por lo que no hay historial suficiente para reconstruirlos. Se deben reconciliar esos registros antes del despliegue; no se borran ni se inventan publicaciones automáticamente.

```sh
pnpm infra:up
pnpm db:migrate
pnpm test:integration
```

Los checks, triggers y FKs diferidas no se reflejan completamente en el schema Prisma. Hay que conservarlos al revisar futuras migraciones y no editar migraciones ya aplicadas a una base persistente.

### Archivos

Creados:

- `apps/api/prisma/migrations/20260921000100_publications/migration.sql`.
- `apps/api/src/application/ports/publication-transaction.ts`.
- `apps/api/src/infrastructure/publication-persistence.module.ts` y `persistence/prisma/{prisma-publication-transaction,prisma-session}.ts`.
- `apps/api/src/modules/publications/domain/repositories/publication.repository.ts` y `entities/publication-restoration.spec.ts`.
- `apps/api/src/modules/publications/infrastructure/persistence/prisma/`: mapper, repositorio y pruebas del mapper.
- `apps/api/test/publication-persistence.integration-spec.ts` y `support/publication-restoration.ts`.
- Este documento.

Modificados: schema Prisma; `Publication` y sus errores; repositorio de campañas para compartir transacciones; `AppModule`; prueba de campañas que antes aceptaba resúmenes sin destinos; README, estado del dominio y referencia histórica del incremento anterior.

### Verificación

- Suite unitaria: 326 pruebas correctas, incluidas 30 nuevas de reconstrucción y mapper.
- `pnpm test:integration`: 52 pruebas correctas, incluidas 16 de publicaciones. Se aplican las tres migraciones a un esquema temporal y se comprueba un segundo despliegue sin pendientes. También se verifica que los resúmenes anteriores sin historial detengan la migración.
- Las pruebas cubren éxitos parciales, reintentos, callbacks repetidos/antiguos, concurrencia con un único ganador, versiones obsoletas, colisiones con rollback del lote, unicidad de destinos e intentos, aislamiento por organización y protección del historial en SQL.
- `pnpm typecheck`, `pnpm lint`, `pnpm db:validate` y `pnpm build`: correctos.
- `pnpm test:e2e`: una prueba HTTP correcta.
- Migración aplicada a PostgreSQL local sin reset; las ocho tablas anteriores permanecen vacías y las tres nuevas también. No se crearon datos de negocio ni se modificó la base independiente de n8n.
- El build ESM de NestJS consultó las once tablas, el repositorio de publicaciones y ambos repositorios dentro de la transacción compartida. Las conexiones se cerraron correctamente. No quedaron esquemas temporales de pruebas.
- `pnpm format:check`: correcto con la configuración compartida anterior de Prettier a 100 columnas.

La CI remota se ejecutará al subir el PR. Las pruebas de integración utilizan PostgreSQL real; el envío a redes continúa fuera de alcance.

### Siguiente paso

Revisar e integrar este incremento mediante PR para cerrar la fase 3. Después iniciar un incremento acotado de la fase 4: contratos HTTP, validación, traducción de errores y endpoints de catálogo con sus pruebas. Los endpoints de generación/publicación deben respetar las dependencias pendientes de las fases posteriores.

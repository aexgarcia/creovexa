# Fase 3 — Incremento 2: persistencia de campañas

Implementado el 20 de septiembre de 2026 en `feat/prisma-campaign-persistence`, desde `main` con el [PR #7](https://github.com/aexgarcia/creovexa/pull/7) integrado. Alcance registrado en la [issue #8](https://github.com/aexgarcia/creovexa/issues/8).

Integrado mediante el [PR #9](https://github.com/aexgarcia/creovexa/pull/9). El estado actual continúa en [persistencia de publicaciones](phase-3-publications.md); este documento conserva las decisiones y verificaciones al cerrar el incremento 2. El incremento 3 exige guardar el resumen y sus destinos en la misma transacción.

## Resultado y alcance

Los seis casos de uso existentes de campañas quedan compuestos en NestJS con persistencia PostgreSQL: crear, solicitar generación, registrar contenido, registrar fallo, aprobar y solicitar regeneración. Dominio y aplicación permanecen sin imports de Prisma o NestJS. No se agregan dependencias.

Se conservan los contratos de aplicación y repositorio. `add` inserta un borrador inicial; `save` exige la siguiente versión del agregado y la versión esperada de la fila. Una actualización no crea campañas ausentes ni cambia su identidad, propietario, referencias comerciales, instrucciones u oferta.

Este incremento no agrega controllers, pantallas, n8n, proveedores de IA ni envío de publicaciones. El resumen de publicación que ya pertenece a `Campaign` se reconstruye y guarda; las entidades `Publication`, sus intentos y su coordinación transaccional siguen pendientes del incremento 3.

## Almacenamiento

| Tabla                          | Responsabilidad                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `campaigns`                    | Estado vigente, referencias comerciales, oferta, contenido candidato/aprobado, destinos aprobados, resumen y versión. |
| `campaign_generations`         | Identidad y número de cada generación, fecha de solicitud y snapshot comercial completo.                              |
| `generated_contents`           | Resultado aceptado de una generación: textos, hashtags, referencias de assets y fecha.                                |
| `campaign_generation_failures` | Código controlado y fecha del fallo aceptado para una generación; se conserva tras reintentar.                        |

Cada contenido referencia una generación de la misma campaña y organización. Su revisión y snapshot se reconstruyen a partir de esa generación inmutable, evitando duplicar dos copias del mismo snapshot en SQL. El agregado solo carga la generación vigente y su candidato; conservar el historial no obliga a cargarlo completo en cada operación.

Se usa JSONB para el snapshot comercial, la oferta y el resumen ya definido por el dominio. No se serializa toda la entidad en una columna: identidades, estado, relaciones, versiones y fechas conservan columnas y restricciones propias. Los decodificadores de JSON validan tipos y reconstruyen objetos de dominio; no convierten JSON arbitrario mediante un cast a una entidad.

Los números de generación y versión usan BIGINT con límite de entero seguro de JavaScript. El snapshot conserva también importes mayores que INT32 sin pérdida de precisión. Las fechas usan TIMESTAMPTZ(3).

## Decisiones

### Estado e historial en una transacción

El problema es que dos workers pueden cargar la misma versión y aceptar resultados incompatibles. El repositorio ejecuta `updateMany` filtrando por organización, ID y versión esperada, y exige una única fila modificada. Si otro escritor ganó, lanza `ConcurrentCampaignModificationError`.

La actualización y las inserciones del historial comparten una transacción. Las referencias a la generación y al candidato se verifican al commit mediante FKs compuestas `DEFERRABLE INITIALLY DEFERRED`. Así se puede reservar primero la escritura de la raíz y luego insertar sus nuevos registros. Una colisión de identidad, FK o validación revierte también el cambio de versión.

Se descartó leer la versión y después actualizar solo por ID: esa comprobación no protege de escrituras simultáneas. Tampoco se usa upsert o un `BaseRepository`. No hay reintento automático que vuelva a ejecutar una decisión de negocio con datos diferentes. Referencia: [transacciones y concurrencia optimista en Prisma 7](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions).

`findById` usa una transacción de lectura `RepeatableRead`, para que las consultas de la raíz y sus relaciones correspondan a la misma vista de PostgreSQL. Las transacciones no contienen llamadas a integraciones externas.

### Historial que no se sobrescribe

Generaciones, contenidos y fallos aceptados se insertan una sola vez. El repositorio compara los valores cuando una transición conserva la misma identidad; no usa actualizaciones o upserts sobre estos registros. Los triggers SQL bloquean UPDATE y DELETE del historial, incluso si se elude el repositorio.

La generación tiene identidad global y número único por campaña/organización; existe como máximo un contenido por generación. Los fallos se guardan aparte para que solicitar otra generación no borre la explicación anterior. Se descartó mantener solo el código de fallo de la raíz porque se perdería al reintentar.

Un callback repetido con el mismo resultado continúa siendo una operación sin cambios, incluso después de volver a cargar la campaña. Un callback de una generación anterior se rechaza. Las publicaciones e integraciones futuras siguen necesitando sus propias garantías de idempotencia.

### Reconstrucción sin ejecutar transiciones

`Campaign.restore` comprueba IDs, estado, fechas, contadores, pertenencia del snapshot/contenido, aprobación y coherencia del resumen. Copia los contenedores de entrada. No simula solicitudes, callbacks ni aprobaciones para reconstruir la entidad.

`Promotion.restore` comprueba valores intrínsecos y período sin consultar el precio actual del producto. Una oferta histórica puede leerse después de vencer o de editar el catálogo; los comandos de negocio siguen validando el vencimiento cuando corresponde. La comparación con el precio comercial se mantiene al crear la campaña y capturar una nueva generación.

`PublicationProgress.restore` reconstruye resultados ya iniciados o terminados conservando sus versiones y destinos. No crea publicaciones ni prueba su existencia en una tabla todavía inexistente.

### Consultas y composición

`PrismaCampaignLookups` implementa los ports del consumidor con proyecciones mínimas de organización, producto y revisión de plantilla. Todas las consultas dependientes verifican organización. La revisión se busca por la identidad fijada en la campaña, aunque la plantilla tenga otra revisión vigente.

`CampaignPersistenceModule` compone los casos de uso. Reloj e IDs se movieron a `RuntimeModule` porque ahora los necesitan dos módulos; así comparten un proveedor reemplazable en pruebas sin depender de la composición comercial. No se agregaron servicios intermediarios.

## Migración y uso local

La migración `20260920000100_campaigns` es incremental. La migración comercial ya integrada permanece intacta. La nueva migración incluye FKs por organización, índices por organización/estado/fecha, unicidad, límites de enteros, restricciones de estado y protección del historial.

```sh
pnpm infra:up
pnpm db:migrate
pnpm test:integration
```

Los triggers, checks y FKs diferidas no están representados por completo en el schema Prisma. Deben conservarse al revisar futuras migraciones. No se deben editar migraciones ya aplicadas a una base persistente.

## Archivos

Creados:

- `apps/api/prisma/migrations/20260920000100_campaigns/migration.sql`.
- `apps/api/src/infrastructure/campaign-persistence.module.ts` y `runtime.module.ts`.
- `apps/api/src/modules/campaigns/infrastructure/persistence/prisma/`: mapper, decodificador JSON, adapter de consultas, repositorio y pruebas JSON.
- `apps/api/src/modules/campaigns/domain/entities/campaign-restoration.spec.ts`.
- `apps/api/test/campaign-persistence.integration-spec.ts` y `support/campaign-restoration.ts`.
- Este documento.

Modificados: schema Prisma; reconstrucción de `Campaign`, `Promotion` y `PublicationProgress`; composición de `AppModule` y módulo comercial; import del reloj en pruebas comerciales; README y estado de la documentación de dominio/persistencia.

## Verificación

- Suite unitaria (`pnpm exec vitest run` desde `apps/api`): 296 pruebas correctas, incluidas 35 nuevas.
- `pnpm test:integration`: 36 pruebas correctas; 21 de campañas y las 15 comerciales existentes. El runner aplica ambas migraciones y verifica un segundo despliegue sin pendientes en un esquema temporal.
- Las pruebas incluyen escritura concurrente con un único ganador, versiones obsoletas, colisiones con rollback, ausencia de upsert, pertenencia, callbacks duplicados/antiguos, revisiones fijadas, importes grandes y conservación/protección SQL del historial.
- `pnpm typecheck`, `pnpm lint`, `pnpm db:validate`, `pnpm format:check` y `pnpm build`: correctos.
- `pnpm test:e2e`: una prueba HTTP correcta; el arranque no requiere consultar PostgreSQL.
- La migración incremental se aplicó a PostgreSQL local. Se conservaron las cuatro tablas comerciales, sin reset ni cambios en la base de n8n.
- El build ESM de NestJS consultó las ocho tablas y ejecutó una consulta del repositorio de campañas; cerró sus conexiones correctamente. No se crearon datos de negocio ni quedaron esquemas temporales de pruebas.

La CI remota se ejecutará al subir el PR. Las pruebas SQL son de integración contra PostgreSQL real; no garantizan entregas de IA o redes sociales, que aún no forman parte del alcance.

## Siguiente incremento

Revisar este incremento mediante PR. Después persistir publicaciones e intentos con unicidad por destino, control de versión y un contrato de escritura que mantenga coherente el resumen de campaña. La fase 3 completa todavía está en curso.

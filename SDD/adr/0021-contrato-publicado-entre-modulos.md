# ADR-0021 · Contrato publicado y aislamiento estricto entre `content-generation` y `campaigns`

- **Estado:** Aceptado, implementado el 2026-11-14
- **Fecha:** 2026-11-14
- **Ámbito:** `campaigns`, `content-generation` y la regla general de comunicación entre módulos
- **Corrige:** la excepción introducida al implementar [ADR-0010](0010-dividir-campaigns.md)

## Contexto

Al extraer `content-generation`, el módulo siguió usando directamente la entidad `Campaign`, su repositorio y su tabla: cargaba el agregado, creaba `GeneratedContent`, bloqueaba la fila de `campaigns` y guardaba la campaña desde sus propios repositorios. Se había aceptado como excepción porque el contenido generado, el cambio de estado y el cierre de la reserva deben confirmarse en una sola transacción.

Esa excepción dejaba las reglas de la campaña al alcance de otro módulo: un cambio interno en `Campaign` podía romper la generación, y nada impedía que la generación modificara la campaña saltándose sus reglas.

## Decisión

1. **`campaigns` publica un contrato explícito** en `src/modules/campaigns/contract.ts`. Es el único archivo de `campaigns` que otro módulo puede importar. Contiene el port `CampaignGenerations`, datos planos (sin entidades ni value objects con comportamiento), el token de inyección y los errores que forman parte del lenguaje compartido.

2. **Cinco operaciones**, todas implementadas dentro de `campaigns` por `PublishedCampaignGenerations`, que traduce entre el agregado y los datos planos:

   | Operación | Qué hace |
   | --- | --- |
   | `view` | Lee la campaña y su generación vigente; opcionalmente exige que una generación concreta sea la vigente |
   | `begin` | Captura el snapshot y pasa la campaña a `GENERATING` |
   | `assertPromotionActive` | Falla si la promoción terminó |
   | `lock` | Dentro de la transacción de quien llama: bloquea la campaña e indica si la generación sigue vigente |
   | `recordContent` | Dentro de la transacción de quien llama: crea el contenido y pasa a `PENDING_APPROVAL` |

3. **La atomicidad se conserva con un contexto de transacción opaco** (`TransactionContext`, en `src/application/ports`). `content-generation` abre la transacción, cierra su reserva y pide a `campaigns` que registre el contenido dentro de esa misma transacción. Ninguno de los dos conoce el cliente de base de datos del otro; la conversión a Prisma vive en infraestructura compartida.

4. **`content-generation` ya no toca la tabla `campaigns`.** El bloqueo de fila que hacían sus repositorios pasó a `campaigns` (`PrismaCampaignWorkspace`).

5. **Se vigila con ESLint** (`no-restricted-imports` en `apps/api/eslint.config.mjs`): `content-generation` solo puede importar `#app/modules/campaigns/contract`, y `campaigns` no puede importar nada de `content-generation`.

## Alternativas consideradas

- **Mantener la excepción documentada:** menos código, pero el aislamiento dependía de la disciplina y no de una regla comprobable.
- **Ports definidos por el consumidor** (como `ProductLookup`): adecuado para consultas simples. Aquí la interacción es rica y la implementación necesita el agregado; definir el port en `content-generation` obligaría a `campaigns` a depender de él o a duplicar tipos.
- **Eventos o patrón outbox** entre los dos módulos: aislamiento máximo, a cambio de consistencia eventual y de manejar compensaciones si falla el registro. Excesivo para un monolito con una sola base de datos.
- **Dos transacciones separadas:** sencillo, pero podría quedar una reserva cerrada sin contenido registrado, o al revés.

## Consecuencias

- Las reglas de `Campaign` solo se ejecutan dentro de `campaigns`. Cambiar el agregado no rompe `content-generation` mientras el contrato se mantenga.
- El contrato es una API interna: cambiarlo exige revisar a sus consumidores, igual que un endpoint.
- `content-generation` duplica unas 30 líneas para leer la imagen base que él mismo guardó, en lugar de importar el lector de `campaigns`.
- La tabla `campaign_assets` sigue compartida: la escribe `content-generation` y la lee `campaigns`. Se resolverá al unificar los assets ([ADR-0010](0010-dividir-campaigns.md)).
- `PrismaCampaignRenderResources` todavía lee `template_revisions` directamente; es el mismo problema con `templates` y queda pendiente.
- **Regla general a partir de ahora:** cuando un módulo necesite algo más que una consulta simple de otro, el proveedor publica un `contract.ts`. Los imports directos que quedan (`OrganizationLogos`, `ProductImages`, `ProductImageError`, `CampaignNotFoundError`) deben migrar a ese esquema.
